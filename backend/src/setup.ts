import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from './db.js';

async function main() {
    console.log('→ Applying schema...');
    const schema = readFileSync(resolve(process.cwd(), 'src/schema.sql'), 'utf-8');
    await pool.query(schema);

    console.log('→ Seeding data...');

    await pool.query(`
    INSERT INTO agents (id, name, description, enabled, mode, tasks_today, success_rate, last_run_at)
    VALUES
      ('content',    'Content Creator Agent',
       'Drafts captions and post ideas aligned with brand voice and campaign goals.',
       TRUE, 'human_review', 4, 98.5, NOW() - INTERVAL '12 minutes'),
      ('publishing', 'Automatic Publishing Agent',
       'Publishes scheduled posts across Facebook and Instagram at their set time.',
       TRUE, 'auto', 6, 100, NOW() - INTERVAL '3 minutes'),
      ('engagement', 'Engagement Agent',
       'Reviews incoming comments and replies to routine messages only.',
       TRUE, 'auto', 11, 96.2, NOW() - INTERVAL '1 minute'),
      ('analytics',  'Analytics & Reporting Agent',
       'Aggregates platform metrics and builds weekly performance reports.',
       TRUE, 'auto', 2, 99.4, NOW() - INTERVAL '45 minutes')
    ON CONFLICT (id) DO NOTHING;
  `);

    await pool.query(`
    INSERT INTO accounts (id, platform, name, handle, status, followers, publishing_enabled, last_synced_at)
    VALUES
      ('fb_main', 'facebook', 'HH Healing Hearts Inc.', '@HHHealingHearts',
       'connected', 12480, TRUE, NOW() - INTERVAL '8 minutes'),
      ('ig_main', 'instagram', 'HH Healing Hearts Inc.', '@hhhealinghearts',
       'connected', 8730, TRUE, NOW() - INTERVAL '8 minutes')
    ON CONFLICT (id) DO NOTHING;
  `);

    await pool.query(`
    INSERT INTO settings (id, org_name, timezone, auto_publish, auto_reply,
                          quiet_hours_start, quiet_hours_end, escalation_email,
                          credentials, emergency_stop)
    VALUES (1, 'HH Healing Hearts Inc.', 'America/New_York', TRUE, TRUE,
            '22:00', '07:00', 'care@hhhealinghearts.org',
            '{"metaAppId":"123456789012345","metaAppSecretMasked":"••••d9f2","pageTokenMasked":"••••a7c1"}',
            FALSE)
    ON CONFLICT (id) DO NOTHING;
  `);

    const posts = await pool.query('SELECT COUNT(*)::int AS n FROM posts');
    if (posts.rows[0].n === 0) {
        await pool.query(`
      INSERT INTO posts (content, platforms, status, scheduled_for, published_at, metrics) VALUES
        ('We are grateful for every volunteer who shows up with a warm meal and an open heart. #HealingHearts',
          ARRAY['facebook','instagram'], 'published', NULL, NOW() - INTERVAL '2 days',
          '{"impressions":8420,"reach":6210,"likes":498,"comments":27,"shares":34}'),
        ('Join us Saturday for our community wellness circle — all are welcome.',
          ARRAY['facebook','instagram'], 'published', NULL, NOW() - INTERVAL '5 days',
          '{"impressions":6210,"reach":4780,"likes":361,"comments":19,"shares":22}'),
        ('Behind the scenes: packing care kits for families this weekend 💛',
          ARRAY['instagram'], 'published', NULL, NOW() - INTERVAL '8 days',
          '{"impressions":4150,"reach":3210,"likes":280,"comments":14,"shares":11}'),
        ('A message of hope as we head into the new week.',
          ARRAY['facebook','instagram'], 'scheduled', NOW() + INTERVAL '1 day', NULL, '{}'),
        ('Reminder: the donation drive closes Friday. Thank you for showing up.',
          ARRAY['facebook'], 'scheduled', NOW() + INTERVAL '3 days', NULL, '{}'),
        ('New blog: how healing begins with being seen.',
          ARRAY['facebook','instagram'], 'draft', NULL, NULL, '{}');
    `);
    }

    const comments = await pool.query('SELECT COUNT(*)::int AS n FROM comments');
    if (comments.rows[0].n === 0) {
        await pool.query(`
      INSERT INTO comments (author, message, platform, status, category, reply, assigned_to) VALUES
        ('Maria G.', 'Thank you for everything you do. My mother was so blessed by your team.',
          'facebook', 'auto_replied', 'routine', 'Thank you so much for your kind words, Maria. 💛', NULL),
        ('Jordan R.', 'I''d like to know if there are volunteer spots open next month.',
          'instagram', 'new', 'routine', NULL, NULL),
        ('Priya S.', 'My family is struggling and we need help — what do we do?',
          'facebook', 'escalated', 'beneficiary', NULL, 'Alex Admin'),
        ('Chris L.', 'This event was unorganized and my kids were disappointed.',
          'facebook', 'escalated', 'complaint', NULL, 'Alex Admin'),
        ('Dana M.', 'Does this program cover medical bills?',
          'instagram', 'escalated', 'medical', NULL, 'Alex Admin'),
        ('Lionel K.', 'Where can I donate? I want to sponsor a family for the holidays.',
          'facebook', 'escalated', 'donation', NULL, NULL),
        ('Ruth P.', 'You all are a gift to this community.',
          'instagram', 'resolved', 'routine', 'Thank you, Ruth! 💛', NULL);
    `);
    }

    await pool.query(`
    INSERT INTO activity_log (actor, role, action, target)
    VALUES
      ('Alex Admin', 'admin', 'Updated agent content', 'content'),
      ('Erin Editor', 'editor', 'Published post', 'facebook'),
      ('Alex Admin', 'admin', 'Rotated credentials', 'integrations'),
      ('Engagement Agent', 'editor', 'Auto-replied to routine comment', 'comments'),
      ('Analytics Agent', 'editor', 'Refreshed analytics', 'analytics');
  `);

    console.log('✓ Done.');
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});