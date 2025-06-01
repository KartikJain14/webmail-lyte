require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const upload = multer(); // in-memory storage for attachments

// Env vars
const PORT = parseInt(process.env.PORT || '3000');
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT);
const SMTPS_ENABLED = process.env.SMTPS_ENABLED === '1';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FORM_PASSWORD = process.env.FORM_PASSWORD;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTPS_ENABLED,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  },
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/send', upload.array('attachment'), async (req, res) => {
  try {
    const {
      sender_name,
      sender_email,
      to,
      cc,
      bcc,
      subject,
      body,
      html,
      password,
    } = req.body;

    // Security check
    if (password !== FORM_PASSWORD) {
      return res.status(403).json({ message: 'Unauthorized: Wrong password', color: '#f00' });
    }

    if (!sender_name || !sender_email || !to) {
      return res.status(400).json({ message: 'Missing required fields', color: '#f00' });
    }

    const mailOptions = {
      from: `"${sender_name}" <${sender_email}>`,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject: subject || '',
      text: body || '',
      attachments: req.files.map(file => ({
        filename: file.originalname,
        content: file.buffer,
      })),
    };

    if (html && html.trim().length > 0) {
      mailOptions.html = html;
    }

    await transporter.sendMail(mailOptions);

    return res.json({ message: 'Email sent successfully!', color: '#0f0' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error: ' + err.message, color: '#f00' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
