exports.up = (pgm) => {
    pgm.createTable('jobs', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        company_id: { type: 'VARCHAR(36)', notNull: true, references: '"companies"', onDelete: 'CASCADE' },
        category_id: { type: 'VARCHAR(36)', notNull: true, references: '"categories"', onDelete: 'CASCADE' },
        title: { type: 'VARCHAR(255)', notNull: true },
        description: { type: 'TEXT' },
        job_type: { type: 'VARCHAR(50)' },
        experience_level: { type: 'VARCHAR(50)' },
        location_type: { type: 'VARCHAR(50)' },
        location_city: { type: 'VARCHAR(255)' },
        salary_min: { type: 'BIGINT' },
        salary_max: { type: 'BIGINT' },
        is_salary_visible: { type: 'BOOLEAN', default: true },
        status: { type: 'VARCHAR(50)', default: 'open' },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
        updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('jobs', 'company_id');
    pgm.createIndex('jobs', 'category_id');
};

exports.down = (pgm) => {
    pgm.dropTable('jobs');
};