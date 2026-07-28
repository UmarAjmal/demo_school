require('dotenv').config();
const pool = require('./db');

async function test() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Testing change-status queries for term_exam...');
        const cRes = await client.query(`SELECT class_id FROM classes LIMIT 1`);
        const secRes = await client.query(`SELECT section_id FROM sections LIMIT 1`);
        const subRes = await client.query(`SELECT subject_id FROM subjects LIMIT 1`);
        const termRes = await client.query(`SELECT id FROM academic_terms LIMIT 1`);
        const termId = termRes.rows[0].id, classId = cRes.rows[0].class_id, sectionId = secRes.rows[0].section_id, subjectId = subRes.rows[0].subject_id, userId = 2, targetStatus = 'approved';
        const approvedBy = targetStatus === 'approved' ? userId : null;
        const publishedBy = targetStatus === 'published' ? userId : null;

        await client.query(
            `UPDATE exam_marks 
             SET status = $1 
             WHERE term_id = $2 AND class_id = $3 AND section_id = $4 AND subject_id = $5`,
            [targetStatus, termId, classId, sectionId, subjectId]
        );

        const checkRes = await client.query(
            `SELECT approval_id FROM exam_sheet_approvals 
             WHERE sheet_type = 'term_exam' AND term_id = $1 AND class_id = $2 AND section_id = $3 AND subject_id = $4 LIMIT 1`,
            [termId, classId, sectionId, subjectId]
        );

        if (checkRes.rows.length > 0) {
            await client.query(
                `UPDATE exam_sheet_approvals
                 SET status = $1,
                     approved_by_user_id = COALESCE($2::int, approved_by_user_id),
                     approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
                     published_by_user_id = COALESCE($3::int, published_by_user_id),
                     published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END,
                     updated_at = NOW()
                 WHERE approval_id = $4`,
                [targetStatus, approvedBy, publishedBy, checkRes.rows[0].approval_id]
            );
            console.log('✅ UPDATE TERM APPROVAL SUCCESS!');
        } else {
            await client.query(
                `INSERT INTO exam_sheet_approvals (sheet_type, term_id, class_id, section_id, subject_id, status, submitted_by_user_id, approved_by_user_id, approved_at, published_by_user_id, published_at)
                 VALUES ('term_exam', $1, $2, $3, $4, $5::text, $6, $7::int, CASE WHEN $5::text = 'approved' THEN NOW() ELSE NULL END, $8::int, CASE WHEN $5::text = 'published' THEN NOW() ELSE NULL END)`,
                [termId, classId, sectionId, subjectId, targetStatus, userId, approvedBy, publishedBy]
            );
            console.log('✅ INSERT TERM APPROVAL SUCCESS!');
        }

        console.log('Testing change-status queries for test_paper...');
        const testRes = await client.query(`SELECT COALESCE(test_id, paper_id) AS test_id FROM test_papers LIMIT 1`);
        if (testRes.rows.length) {
            const testId = testRes.rows[0].test_id;

            await client.query(
                `UPDATE test_papers SET status = $1 WHERE (test_id = $2 OR paper_id = $2)`,
                [targetStatus, testId]
            );

            const checkTest = await client.query(
                `SELECT approval_id FROM exam_sheet_approvals 
                 WHERE sheet_type = 'test_paper' AND test_id = $1 LIMIT 1`,
                [testId]
            );

            if (checkTest.rows.length > 0) {
                await client.query(
                    `UPDATE exam_sheet_approvals
                     SET status = $1,
                         approved_by_user_id = COALESCE($2::int, approved_by_user_id),
                         approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
                         published_by_user_id = COALESCE($3::int, published_by_user_id),
                         published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END,
                         updated_at = NOW()
                     WHERE approval_id = $4`,
                    [targetStatus, approvedBy, publishedBy, checkTest.rows[0].approval_id]
                );
                console.log('✅ UPDATE TEST APPROVAL SUCCESS!');
            } else {
                await client.query(
                    `INSERT INTO exam_sheet_approvals (sheet_type, test_id, class_id, section_id, status, submitted_by_user_id, approved_by_user_id, approved_at, published_by_user_id, published_at)
                     SELECT 'test_paper', $1, class_id, section_id, $2::text, $3, $4::int, CASE WHEN $2::text = 'approved' THEN NOW() ELSE NULL END, $5::int, CASE WHEN $2::text = 'published' THEN NOW() ELSE NULL END
                     FROM test_papers WHERE (test_id = $1 OR paper_id = $1) LIMIT 1`,
                    [testId, targetStatus, userId, approvedBy, publishedBy]
                );
                console.log('✅ INSERT TEST APPROVAL SUCCESS!');
            }
        }

        await client.query('ROLLBACK');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ ERROR:', e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

test();
