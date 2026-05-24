require('dotenv').config();
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT, 10),
});

const QUEUE_NAME = 'application_notifications';

const getAmqpUrl = () => {
  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || '5672';
  const user = process.env.RABBITMQ_USER || 'guest';
  const password = process.env.RABBITMQ_PASSWORD || 'guest';
  return process.env.AMQP_URL || `amqp://${user}:${password}@${host}:${port}`;
};

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const processApplication = async (applicationId) => {
  try {
    // Ambil data application + pelamar + job
    const result = await pool.query(
      `SELECT a.id, a.created_at,
              u.name AS applicant_name, u.email AS applicant_email,
              j.title AS job_title, j.company_id
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (result.rows.length === 0) {
      console.log(`Application ${applicationId} not found, skipping`);
      return;
    }

    const app = result.rows[0];

    // Cari job owner — user yang membuat company tersebut
    // Karena tidak ada relasi langsung, kita cari user admin
    // atau user pertama yang bukan pelamar itu sendiri
    const ownerResult = await pool.query(
      `SELECT u.email, u.name
       FROM users u
       WHERE u.role = 'admin'
       LIMIT 1`
    );

    if (ownerResult.rows.length === 0) {
      console.log('No job owner (admin) found, skipping email');
      return;
    }

    const owner = ownerResult.rows[0];

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: owner.email,
      subject: `[OpenJob] Lamaran Baru untuk ${app.job_title}`,
      html: `
        <h2>Ada Lamaran Baru!</h2>
        <p>Halo ${owner.name},</p>
        <p>Seorang kandidat baru telah melamar posisi <strong>${app.job_title}</strong>.</p>
        <h3>Detail Pelamar:</h3>
        <ul>
          <li><strong>Nama:</strong> ${app.applicant_name}</li>
          <li><strong>Email:</strong> ${app.applicant_email}</li>
          <li><strong>Tanggal Melamar:</strong> ${new Date(app.created_at).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}</li>
        </ul>
        <p>Silakan login ke platform OpenJob untuk meninjau lamaran ini.</p>
        <br/>
        <p>Salam,<br/>Tim OpenJob</p>
      `,
    });

    console.log(`Email notifikasi terkirim ke ${owner.email} untuk application ${applicationId}`);
  } catch (err) {
    console.error('Error saat memproses application:', err.message);
  }
};

const startConsumer = async () => {
  try {
    const connection = await amqp.connect(getAmqpUrl());
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);

    console.log(`Consumer aktif, menunggu pesan di queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log('Pesan diterima:', data);
          await processApplication(data.application_id);
          channel.ack(msg);
        } catch (err) {
          console.error('Error memproses pesan:', err.message);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (err) {
    console.error('Gagal konek ke RabbitMQ:', err.message);
    console.log('Mencoba ulang dalam 5 detik...');
    setTimeout(startConsumer, 5000);
  }
};

startConsumer();
