const pool = require('./db');

async function runEssentialMigrations() {
    const client = await pool.connect();
    try {
        console.log("🚀 Running essential database migrations...");
        await client.query('BEGIN');

        // 1. Academic Terms Migration
        console.log("   → Checking academic_terms columns...");
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_terms' AND column_name='has_summer_work') THEN
                    ALTER TABLE academic_terms ADD COLUMN has_summer_work BOOLEAN DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_terms' AND column_name='has_winter_work') THEN
                    ALTER TABLE academic_terms ADD COLUMN has_winter_work BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);

        // 2. Fee Plans Migration
        console.log("   → Checking fee_plans columns...");
        await client.query(`
            ALTER TABLE fee_plans ADD COLUMN IF NOT EXISTS applies_to_all BOOLEAN DEFAULT FALSE;
        `);

        // 3. Print Tracking Migration (monthly_fee_slips)
        console.log("   → Checking monthly_fee_slips columns...");
        await client.query(`
            ALTER TABLE monthly_fee_slips 
            ADD COLUMN IF NOT EXISTS is_printed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP;
        `);

        // 5. Print Tracking Migration (fee_payments)
        console.log("   → Checking fee_payments columns...");
        await client.query(`
            ALTER TABLE fee_payments
            ADD COLUMN IF NOT EXISTS is_printed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP;
        `);

        // 6. School Settings logo_url Migration (allow storing Base64 image data in DB)
        console.log("   → Checking school_settings logo_url column type...");
        await client.query(`
            ALTER TABLE school_settings ALTER COLUMN logo_url TYPE TEXT;
        `);
        //    Father name matching is unreliable in Pakistani naming conventions where
        //    cousins often share the same grandfather's name as their father name.
        //
        //    The student_siblings table is the ONLY source of truth for relation_type.
        //    Relationships are explicitly set when:
        //      a) A student is created with siblings (explicit relation_type)
        //      b) Families are manually linked via /families/manual-link
        //      c) Families are merged via /families/merge
        //
        //    Students in the same family with NO entry in student_siblings will have
        //    relation_type = NULL which the frontend shows as "Family Member".
        //    These should be manually linked via the family management UI.

        // 4. REPAIR: Fix any student_siblings rows incorrectly marked 'blood'
        //    where the two students have DIFFERENT father names.
        //    Blood siblings MUST share the same father — different father = cousin or unrelated.
        //    This repair corrects data corrupted by a previous migration that used DO UPDATE.
        //    It is safe to run repeatedly (idempotent).
        console.log("   → Repairing incorrectly marked blood siblings...");
        const repairResult = await client.query(`
            UPDATE student_siblings ss
            SET relation_type = 'cousin'
            FROM students a, students b
            WHERE ss.student_id = a.student_id
              AND ss.sibling_id = b.student_id
              AND ss.relation_type = 'blood'
              AND COALESCE(REPLACE(LOWER(TRIM(a.father_name)), ' ', ''), '') != ''
              AND COALESCE(REPLACE(LOWER(TRIM(b.father_name)), ' ', ''), '') != ''
              AND COALESCE(REPLACE(LOWER(TRIM(a.father_name)), ' ', ''), '') 
                  != COALESCE(REPLACE(LOWER(TRIM(b.father_name)), ' ', ''), '')
        `);
        console.log(`   ✓ Repaired ${repairResult.rowCount} incorrectly marked blood sibling rows.`);

        // 7. Subjects Term Association Migration
        console.log("   → Checking subjects term_id column & constraints...");
        await client.query(`
            ALTER TABLE subjects ADD COLUMN IF NOT EXISTS term_id INTEGER REFERENCES academic_terms(id) ON DELETE SET NULL;
            ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_section_id_subject_name_key;
            ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_section_term_subject_name_key;
            ALTER TABLE subjects ADD CONSTRAINT subjects_section_term_subject_name_key UNIQUE (section_id, subject_name, term_id);
        `);

        // 8. Test Papers Columns Migration (Standardize test_id & subject_id)
        console.log("   → Checking test_papers & test_marks columns...");
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_papers' AND column_name='paper_name')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_papers' AND column_name='test_name') THEN
                    ALTER TABLE test_papers RENAME COLUMN paper_name TO test_name;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_papers' AND column_name='paper_name') THEN
                    ALTER TABLE test_papers ALTER COLUMN paper_name DROP NOT NULL;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_papers' AND column_name='test_name') THEN
                        UPDATE test_papers SET test_name = paper_name WHERE test_name IS NULL AND paper_name IS NOT NULL;
                    END IF;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_papers' AND column_name='paper_id')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_papers' AND column_name='test_id') THEN
                    ALTER TABLE test_papers RENAME COLUMN paper_id TO test_id;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_papers' AND column_name='paper_id') THEN
                    ALTER TABLE test_papers ALTER COLUMN paper_id DROP NOT NULL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_marks' AND column_name='paper_id')
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_marks' AND column_name='test_id') THEN
                    ALTER TABLE test_marks RENAME COLUMN paper_id TO test_id;
                END IF;
            END $$;
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_papers (
                test_id SERIAL PRIMARY KEY,
                test_name VARCHAR(200) NOT NULL,
                description TEXT,
                total_marks NUMERIC(10,2) NOT NULL CHECK (total_marks > 0),
                class_id INTEGER NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
                section_id INTEGER NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
                subject_id INTEGER NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
                created_by_user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
                created_by_employee_id INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE test_papers ADD COLUMN IF NOT EXISTS test_id SERIAL;
            ALTER TABLE test_papers ADD COLUMN IF NOT EXISTS test_name VARCHAR(200);
            ALTER TABLE test_papers ADD COLUMN IF NOT EXISTS description TEXT;
            ALTER TABLE test_papers ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(subject_id) ON DELETE CASCADE;
            ALTER TABLE test_papers ADD COLUMN IF NOT EXISTS created_by_employee_id INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_test_papers_class_sec_sub ON test_papers(class_id, section_id, subject_id);
        `);

        await client.query('COMMIT');
        console.log("✅ All essential migrations completed successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", err.message);
        // We don't exit process here because we want the server to try and start anyway
    } finally {
        client.release();
    }
}

module.exports = { runEssentialMigrations };
