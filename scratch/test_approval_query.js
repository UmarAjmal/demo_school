require('dotenv').config({ path: './server/.env' });
const pool = require('../server/db');

async function test() {
    const client = await pool.connect();
    try {
        console.log('Testing termQ query...');
        const termQ = `
            SELECT 
                em.term_id, t.term_name,
                em.class_id, c.class_name,
                em.section_id, sec.section_name,
                em.subject_id, sub.subject_name,
                COALESCE(esa.status, em.status, 'pending') AS status,
                COUNT(DISTINCT em.student_id)::int AS student_count,
                MAX(em.updated_at) AS last_updated,
                COALESCE(u_sub.username, 'Teacher') AS submitted_by_name,
                COALESCE(u_app.username, '-') AS approved_by_name,
                COALESCE(u_pub.username, '-') AS published_by_name
            FROM exam_marks em
            JOIN academic_terms t ON t.id = em.term_id
            JOIN classes c ON c.class_id = em.class_id
            JOIN sections sec ON sec.section_id = em.section_id
            JOIN subjects sub ON sub.subject_id = em.subject_id
            LEFT JOIN exam_sheet_approvals esa 
              ON esa.sheet_type = 'term_exam' 
             AND esa.term_id = em.term_id 
             AND esa.class_id = em.class_id 
             AND esa.section_id = em.section_id 
             AND esa.subject_id = em.subject_id
            LEFT JOIN app_users u_sub ON u_sub.id = esa.submitted_by_user_id
            LEFT JOIN app_users u_app ON u_app.id = esa.approved_by_user_id
            LEFT JOIN app_users u_pub ON u_pub.id = esa.published_by_user_id
            WHERE 1=1
            GROUP BY em.term_id, t.term_name, em.class_id, c.class_name, em.section_id, sec.section_name, em.subject_id, sub.subject_name, esa.status, em.status, u_sub.username, u_app.username, u_pub.username
            ORDER BY last_updated DESC
        `;
        const r1 = await client.query(termQ);
        console.log('✅ TERM QUERY SUCCESS! Row count:', r1.rows.length);

        console.log('Testing testQ query...');
        const testQ = `
            SELECT 
                COALESCE(tp.test_id, tp.paper_id) AS test_id,
                COALESCE(tp.test_name, tp.paper_name) AS test_name,
                tp.description, tp.total_marks,
                tp.class_id, c.class_name,
                tp.section_id, sec.section_name,
                tp.subject_id, sub.subject_name,
                COALESCE(esa.status, tp.status, 'pending') AS status,
                (SELECT COUNT(*) FROM test_marks tm WHERE tm.test_id = COALESCE(tp.test_id, tp.paper_id) OR tm.paper_id = COALESCE(tp.test_id, tp.paper_id))::int AS student_count,
                tp.created_at AS last_updated,
                COALESCE(u_sub.username, e.first_name || ' ' || e.last_name, 'Teacher') AS submitted_by_name,
                COALESCE(u_app.username, '-') AS approved_by_name,
                COALESCE(u_pub.username, '-') AS published_by_name
            FROM test_papers tp
            JOIN classes c ON c.class_id = tp.class_id
            JOIN sections sec ON sec.section_id = tp.section_id
            JOIN subjects sub ON sub.subject_id = tp.subject_id
            LEFT JOIN employees e ON e.employee_id = tp.created_by_employee_id
            LEFT JOIN exam_sheet_approvals esa 
              ON esa.sheet_type = 'test_paper' 
             AND esa.test_id = COALESCE(tp.test_id, tp.paper_id)
            LEFT JOIN app_users u_sub ON u_sub.id = esa.submitted_by_user_id
            LEFT JOIN app_users u_app ON u_app.id = esa.approved_by_user_id
            LEFT JOIN app_users u_pub ON u_pub.id = esa.published_by_user_id
            WHERE 1=1
            ORDER BY tp.created_at DESC
        `;
        const r2 = await client.query(testQ);
        console.log('✅ TEST QUERY SUCCESS! Row count:', r2.rows.length);

    } catch (e) {
        console.error('❌ SQL ERROR:', e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

test();
