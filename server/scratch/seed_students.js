const pool = require('../db');

const familiesData = [
    { family_id: 'FAM-2026-001', family_name: 'Muhammad Tariq', primary_contact_name: 'Muhammad Tariq', primary_contact_phone: '0300-1234561', family_fee: 4500 },
    { family_id: 'FAM-2026-002', family_name: 'Rashid Mehmood', primary_contact_name: 'Rashid Mehmood', primary_contact_phone: '0301-2345672', family_fee: 3000 },
    { family_id: 'FAM-2026-003', family_name: 'Bilal Ahmad', primary_contact_name: 'Bilal Ahmad', primary_contact_phone: '0302-3456783', family_fee: 2800 },
    { family_id: 'FAM-2026-004', family_name: 'Kamran Khan', primary_contact_name: 'Kamran Khan', primary_contact_phone: '0303-4567894', family_fee: 5000 },
    { family_id: 'FAM-2026-005', family_name: 'Imran Shah', primary_contact_name: 'Imran Shah', primary_contact_phone: '0304-5678905', family_fee: 0 },
    { family_id: 'FAM-2026-006', family_name: 'Shahid Iqbal', primary_contact_name: 'Shahid Iqbal', primary_contact_phone: '0305-6789016', family_fee: 3200 },
    { family_id: 'FAM-2026-007', family_name: 'Asif Raza', primary_contact_name: 'Asif Raza', primary_contact_phone: '0306-7890127', family_fee: 4800 },
    { family_id: 'FAM-2026-008', family_name: 'Farhan Ali', primary_contact_name: 'Farhan Ali', primary_contact_phone: '0307-8901238', family_fee: 2700 },
    { family_id: 'FAM-2026-009', family_name: 'Zulfiqar Ahmed', primary_contact_name: 'Zulfiqar Ahmed', primary_contact_phone: '0308-9012349', family_fee: 3000 },
    { family_id: 'FAM-2026-010', family_name: 'Nadeem Akhtar', primary_contact_name: 'Nadeem Akhtar', primary_contact_phone: '0309-0123450', family_fee: 5200 },
    { family_id: 'FAM-2026-011', family_name: 'Adnan Malik', primary_contact_name: 'Adnan Malik', primary_contact_phone: '0310-1234561', family_fee: 0 },
    { family_id: 'FAM-2026-012', family_name: 'Waqas Hassan', primary_contact_name: 'Waqas Hassan', primary_contact_phone: '0311-2345672', family_fee: 2900 },
    { family_id: 'FAM-2026-013', family_name: 'Rizwan Butt', primary_contact_name: 'Rizwan Butt', primary_contact_phone: '0312-3456783', family_fee: 5500 },
    { family_id: 'FAM-2026-014', family_name: 'Shoaib Hussain', primary_contact_name: 'Shoaib Hussain', primary_contact_phone: '0313-4567894', family_fee: 4600 }
];

const studentsData = [
    // Family 1 (3 siblings: 2 Normal, 1 Trusted)
    { admission_no: '2026-001', roll_no: '101', first_name: 'Ali', last_name: 'Tariq', gender: 'Male', dob: '2019-03-15', class_id: 1, section_id: 1, category: 'Normal', father_name: 'Muhammad Tariq', father_phone: '0300-1234561', father_cnic: '35202-1111111-1', monthly_fee: 2500, family_id: 'FAM-2026-001', status: 'Active', admission_date: '2026-01-10' },
    { admission_no: '2026-002', roll_no: '301', first_name: 'Fatima', last_name: 'Tariq', gender: 'Female', dob: '2017-06-20', class_id: 3, section_id: 9, category: 'Trusted', father_name: 'Muhammad Tariq', father_phone: '0300-1234561', father_cnic: '35202-1111111-1', monthly_fee: 0, family_id: 'FAM-2026-001', status: 'Active', admission_date: '2026-01-10' },
    { admission_no: '2026-003', roll_no: '501', first_name: 'Hamza', last_name: 'Tariq', gender: 'Male', dob: '2015-09-05', class_id: 5, section_id: 14, category: 'Normal', father_name: 'Muhammad Tariq', father_phone: '0300-1234561', father_cnic: '35202-1111111-1', monthly_fee: 2000, family_id: 'FAM-2026-001', status: 'Active', admission_date: '2026-01-10' },

    // Family 2 (2 siblings: 1 Normal, 1 Trusted)
    { admission_no: '2026-004', roll_no: '201', first_name: 'Usman', last_name: 'Rashid', gender: 'Male', dob: '2018-02-12', class_id: 2, section_id: 5, category: 'Normal', father_name: 'Rashid Mehmood', father_phone: '0301-2345672', father_cnic: '35202-2222222-2', monthly_fee: 3000, family_id: 'FAM-2026-002', status: 'Active', admission_date: '2026-01-12' },
    { admission_no: '2026-005', roll_no: '401', first_name: 'Aisha', last_name: 'Rashid', gender: 'Female', dob: '2016-04-18', class_id: 4, section_id: 10, category: 'Trusted', father_name: 'Rashid Mehmood', father_phone: '0301-2345672', father_cnic: '35202-2222222-2', monthly_fee: 0, family_id: 'FAM-2026-002', status: 'Active', admission_date: '2026-01-12' },

    // Family 3 (1 Normal)
    { admission_no: '2026-006', roll_no: '102', first_name: 'Zainab', last_name: 'Bilal', gender: 'Female', dob: '2019-08-25', class_id: 1, section_id: 2, category: 'Normal', father_name: 'Bilal Ahmad', father_phone: '0302-3456783', father_cnic: '35202-3333333-3', monthly_fee: 2800, family_id: 'FAM-2026-003', status: 'Active', admission_date: '2026-01-15' },

    // Family 4 (2 Normal)
    { admission_no: '2026-007', roll_no: '202', first_name: 'Saad', last_name: 'Kamran', gender: 'Male', dob: '2018-05-30', class_id: 2, section_id: 4, category: 'Normal', father_name: 'Kamran Khan', father_phone: '0303-4567894', father_cnic: '35202-4444444-4', monthly_fee: 2500, family_id: 'FAM-2026-004', status: 'Active', admission_date: '2026-01-15' },
    { admission_no: '2026-008', roll_no: '402', first_name: 'Omer', last_name: 'Kamran', gender: 'Male', dob: '2016-11-14', class_id: 4, section_id: 12, category: 'Normal', father_name: 'Kamran Khan', father_phone: '0303-4567894', father_cnic: '35202-4444444-4', monthly_fee: 2500, family_id: 'FAM-2026-004', status: 'Active', admission_date: '2026-01-15' },

    // Family 5 (1 Trusted)
    { admission_no: '2026-009', roll_no: '302', first_name: 'Maryam', last_name: 'Imran', gender: 'Female', dob: '2017-01-22', class_id: 3, section_id: 7, category: 'Trusted', father_name: 'Imran Shah', father_phone: '0304-5678905', father_cnic: '35202-5555555-5', monthly_fee: 0, family_id: 'FAM-2026-005', status: 'Active', admission_date: '2026-01-16' },

    // Family 6 (1 Normal)
    { admission_no: '2026-010', roll_no: '103', first_name: 'Hassan', last_name: 'Shahid', gender: 'Male', dob: '2019-10-08', class_id: 1, section_id: 3, category: 'Normal', father_name: 'Shahid Iqbal', father_phone: '0305-6789016', father_cnic: '35202-6666666-6', monthly_fee: 3200, family_id: 'FAM-2026-006', status: 'Active', admission_date: '2026-01-18' },

    // Family 7 (2 Normal)
    { admission_no: '2026-011', roll_no: '203', first_name: 'Ibrahim', last_name: 'Asif', gender: 'Male', dob: '2018-07-19', class_id: 2, section_id: 6, category: 'Normal', father_name: 'Asif Raza', father_phone: '0306-7890127', father_cnic: '35202-7777777-7', monthly_fee: 2400, family_id: 'FAM-2026-007', status: 'Active', admission_date: '2026-01-20' },
    { admission_no: '2026-012', roll_no: '502', first_name: 'Khadija', last_name: 'Asif', gender: 'Female', dob: '2015-12-03', class_id: 5, section_id: 13, category: 'Normal', father_name: 'Asif Raza', father_phone: '0306-7890127', father_cnic: '35202-7777777-7', monthly_fee: 2400, family_id: 'FAM-2026-007', status: 'Active', admission_date: '2026-01-20' },

    // Family 8 (2 siblings: 1 Trusted, 1 Normal)
    { admission_no: '2026-013', roll_no: '303', first_name: 'Abdullah', last_name: 'Farhan', gender: 'Male', dob: '2017-09-11', class_id: 3, section_id: 8, category: 'Trusted', father_name: 'Farhan Ali', father_phone: '0307-8901238', father_cnic: '35202-8888888-8', monthly_fee: 0, family_id: 'FAM-2026-008', status: 'Active', admission_date: '2026-01-22' },
    { admission_no: '2026-014', roll_no: '503', first_name: 'Zoha', last_name: 'Farhan', gender: 'Female', dob: '2015-03-27', class_id: 5, section_id: 15, category: 'Normal', father_name: 'Farhan Ali', father_phone: '0307-8901238', father_cnic: '35202-8888888-8', monthly_fee: 2700, family_id: 'FAM-2026-008', status: 'Active', admission_date: '2026-01-22' },

    // Family 9 (1 Normal)
    { admission_no: '2026-015', roll_no: '403', first_name: 'Mahnoor', last_name: 'Zulfiqar', gender: 'Female', dob: '2016-08-16', class_id: 4, section_id: 11, category: 'Normal', father_name: 'Zulfiqar Ahmed', father_phone: '0308-9012349', father_cnic: '35202-9999999-9', monthly_fee: 3000, family_id: 'FAM-2026-009', status: 'Active', admission_date: '2026-01-25' },

    // Family 10 (2 Normal)
    { admission_no: '2026-016', roll_no: '104', first_name: 'Rayyan', last_name: 'Nadeem', gender: 'Male', dob: '2019-04-02', class_id: 1, section_id: 1, category: 'Normal', father_name: 'Nadeem Akhtar', father_phone: '0309-0123450', father_cnic: '35202-1010101-0', monthly_fee: 2600, family_id: 'FAM-2026-010', status: 'Active', admission_date: '2026-01-26' },
    { admission_no: '2026-017', roll_no: '304', first_name: 'Anaya', last_name: 'Nadeem', gender: 'Female', dob: '2017-07-29', class_id: 3, section_id: 9, category: 'Normal', father_name: 'Nadeem Akhtar', father_phone: '0309-0123450', father_cnic: '35202-1010101-0', monthly_fee: 2600, family_id: 'FAM-2026-010', status: 'Active', admission_date: '2026-01-26' },

    // Family 11 (2 Trusted)
    { admission_no: '2026-018', roll_no: '204', first_name: 'Yahya', last_name: 'Adnan', gender: 'Male', dob: '2018-12-10', class_id: 2, section_id: 5, category: 'Trusted', father_name: 'Adnan Malik', father_phone: '0310-1234561', father_cnic: '35202-2020202-2', monthly_fee: 0, family_id: 'FAM-2026-011', status: 'Active', admission_date: '2026-01-28' },
    { admission_no: '2026-019', roll_no: '404', first_name: 'Minahil', last_name: 'Adnan', gender: 'Female', dob: '2016-05-15', class_id: 4, section_id: 10, category: 'Trusted', father_name: 'Adnan Malik', father_phone: '0310-1234561', father_cnic: '35202-2020202-2', monthly_fee: 0, family_id: 'FAM-2026-011', status: 'Active', admission_date: '2026-01-28' },

    // Family 12 (1 Normal)
    { admission_no: '2026-020', roll_no: '504', first_name: 'Mustafa', last_name: 'Waqas', gender: 'Male', dob: '2015-10-24', class_id: 5, section_id: 13, category: 'Normal', father_name: 'Waqas Hassan', father_phone: '0311-2345672', father_cnic: '35202-3030303-3', monthly_fee: 2900, family_id: 'FAM-2026-012', status: 'Active', admission_date: '2026-02-01' },

    // Family 13 (3 siblings: 2 Normal, 1 Trusted)
    { admission_no: '2026-021', roll_no: '105', first_name: 'Eshal', last_name: 'Rizwan', gender: 'Female', dob: '2019-01-17', class_id: 1, section_id: 2, category: 'Normal', father_name: 'Rizwan Butt', father_phone: '0312-3456783', father_cnic: '35202-4040404-4', monthly_fee: 2750, family_id: 'FAM-2026-013', status: 'Active', admission_date: '2026-02-03' },
    { admission_no: '2026-022', roll_no: '305', first_name: 'Arham', last_name: 'Rizwan', gender: 'Male', dob: '2017-03-31', class_id: 3, section_id: 8, category: 'Trusted', father_name: 'Rizwan Butt', father_phone: '0312-3456783', father_cnic: '35202-4040404-4', monthly_fee: 0, family_id: 'FAM-2026-013', status: 'Active', admission_date: '2026-02-03' },
    { admission_no: '2026-023', roll_no: '505', first_name: 'Bareerah', last_name: 'Rizwan', gender: 'Female', dob: '2015-08-09', class_id: 5, section_id: 14, category: 'Normal', father_name: 'Rizwan Butt', father_phone: '0312-3456783', father_cnic: '35202-4040404-4', monthly_fee: 2750, family_id: 'FAM-2026-013', status: 'Active', admission_date: '2026-02-03' },

    // Family 14 (2 Normal)
    { admission_no: '2026-024', roll_no: '205', first_name: 'Moiz', last_name: 'Shoaib', gender: 'Male', dob: '2018-11-21', class_id: 2, section_id: 4, category: 'Normal', father_name: 'Shoaib Hussain', father_phone: '0313-4567894', father_cnic: '35202-5050505-5', monthly_fee: 2300, family_id: 'FAM-2026-014', status: 'Active', admission_date: '2026-02-05' },
    { admission_no: '2026-025', roll_no: '405', first_name: 'Hania', last_name: 'Shoaib', gender: 'Female', dob: '2016-02-28', class_id: 4, section_id: 12, category: 'Normal', father_name: 'Shoaib Hussain', father_phone: '0313-4567894', father_cnic: '35202-5050505-5', monthly_fee: 2300, family_id: 'FAM-2026-014', status: 'Active', admission_date: '2026-02-05' }
];

async function insertData() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Inserting 14 families...');
        for (const f of familiesData) {
            await client.query(
                `INSERT INTO families (family_id, family_name, primary_contact_name, primary_contact_phone, family_fee, opening_balance, opening_balance_paid)
                 VALUES ($1, $2, $3, $4, $5, 0, 0)
                 ON CONFLICT (family_id) DO UPDATE SET family_fee = EXCLUDED.family_fee`,
                [f.family_id, f.family_name, f.primary_contact_name, f.primary_contact_phone, f.family_fee]
            );
        }

        console.log('Inserting 25 students...');
        for (const s of studentsData) {
            await client.query(
                `INSERT INTO students (
                    admission_no, roll_no, first_name, last_name, gender, dob, class_id, section_id,
                    category, father_name, father_phone, father_cnic, monthly_fee, family_id, status, admission_date
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [
                    s.admission_no, s.roll_no, s.first_name, s.last_name, s.gender, s.dob,
                    s.class_id, s.section_id, s.category, s.father_name, s.father_phone,
                    s.father_cnic, s.monthly_fee, s.family_id, s.status, s.admission_date
                ]
            );
        }

        await client.query('COMMIT');
        console.log('SUCCESSFULLY INSERTED 14 FAMILIES AND 25 STUDENTS!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR INSERTING DATA:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

insertData();
