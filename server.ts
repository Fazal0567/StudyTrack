import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'StudyTrack API', timestamp: new Date().toISOString() });
  });

  // Check Email Server Configuration Status
  app.get('/api/email-status', (req, res) => {
    const isSmtpConfigured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );

    res.json({
      configured: isSmtpConfigured,
      host: process.env.SMTP_HOST || 'Not configured (Using Ethereal Sandbox)',
      mode: isSmtpConfigured ? 'smtp' : 'ethereal',
    });
  });

  // Helper to create appropriate transporter
  const getEmailTransporter = async () => {
    const isSmtpConfigured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );

    if (isSmtpConfigured) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return { transporter, isCustomSmtp: true, fromAddress: process.env.SMTP_FROM || `StudyTrack <${process.env.SMTP_USER}>` };
    }

    // Try Ethereal Test Account
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return { transporter, isCustomSmtp: false, fromAddress: '"StudyTrack Reminders" <reminders@studytrack.app>' };
    } catch (err) {
      console.warn('Could not create Ethereal test account:', err);
      return { transporter: null, isCustomSmtp: false, fromAddress: '"StudyTrack Reminders" <reminders@studytrack.app>' };
    }
  };

  // Test Email Endpoint
  app.post('/api/send-test-email', async (req, res) => {
    const { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email recipient is required' });
    }

    const appUrl =
      process.env.APP_URL ||
      (req.headers.origin ? String(req.headers.origin) : `${req.protocol}://${req.get('host')}`);

    try {
      const { transporter, isCustomSmtp, fromAddress } = await getEmailTransporter();

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px;">
          <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📚 StudyTrack</h1>
            <p style="margin: 4px 0 0 0; opacity: 0.9;">Email Reminders Verification</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; color: #1e293b;">Hello <strong>${userName || 'Student'}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Your study target reminder setup in <strong>StudyTrack</strong> is active and working! You will receive study target updates straight to this inbox.
            </p>
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: bold;">
                💡 Daily Study Tip
              </p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #1d4ed8;">
                Set 3 achievable study targets each morning to maintain your daily study streak!
              </p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Open StudyTrack App
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
              StudyTrack — Distraction-Free Daily Target Tracker
            </p>
          </div>
        </div>
      `;

      if (transporter) {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: '📚 StudyTrack Test Notification & Verification',
          html: htmlContent,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);

        if (isCustomSmtp) {
          return res.json({
            success: true,
            smtpConfigured: true,
            mode: 'smtp',
            message: `Live test email delivered to ${email}! Check your inbox.`,
          });
        } else {
          return res.json({
            success: true,
            smtpConfigured: false,
            mode: 'ethereal',
            message: `Sandbox email generated for ${email}! View preview link.`,
            previewUrl: previewUrl || null,
          });
        }
      } else {
        return res.json({
          success: true,
          smtpConfigured: false,
          mode: 'simulation',
          message: `Simulation mode: Test email prepared for ${email}. Configure SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) in Secrets to receive real inbox emails.`,
        });
      }
    } catch (error: any) {
      console.error('Email sending error:', error?.message || error);
      return res.json({
        success: false,
        smtpConfigured: false,
        mode: 'error',
        message: `Failed to deliver email: ${error?.message || 'SMTP connection error'}. Please verify SMTP credentials in settings or environment.`,
      });
    }
  });

  // Scheduled / Manual Email Reminder Endpoint
  app.post('/api/send-email-reminder', async (req, res) => {
    const { toEmail, userName, reminderType, tasks } = req.body;

    if (!toEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const appUrl =
      process.env.APP_URL ||
      (req.headers.origin ? String(req.headers.origin) : `${req.protocol}://${req.get('host')}`);

    const typeTitles: Record<string, string> = {
      morning: '🌅 Morning Study Targets Plan',
      evening: '🌇 Evening Study Target Check-in',
      night: '🌙 Daily Study Target Wrap-up',
    };

    const subject = typeTitles[reminderType] || '📚 Your StudyTrack Update';
    const pendingTasks = (tasks || []).filter((t: any) => t.status === 'Pending');
    const completedTasks = (tasks || []).filter((t: any) => t.status === 'Completed');

    let taskListHtml = '';
    if (tasks && tasks.length > 0) {
      taskListHtml = tasks
        .map((t: any) => {
          let badgeBg = '#e2e8f0';
          let badgeColor = '#334155';
          if (t.status === 'Completed') {
            badgeBg = '#dcfce7';
            badgeColor = '#166534';
          } else if (t.status === 'Missed') {
            badgeBg = '#fee2e2';
            badgeColor = '#991b1b';
          } else {
            badgeBg = '#dbeafe';
            badgeColor = '#1e40af';
          }

          return `
            <div style="padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">
                  ${t.subject || 'General'}
                </span>
                <span style="font-weight: 600; font-size: 14px; color: #0f172a;">${t.title}</span>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  ⏱ Est: ${t.estimatedTime || 30} mins ${t.dueTime ? `| ⏰ Due: ${t.dueTime}` : ''}
                </div>
              </div>
              <span style="font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 12px; background-color: ${badgeBg}; color: ${badgeColor};">
                ${t.status}
              </span>
            </div>
          `;
        })
        .join('');
    } else {
      taskListHtml = `<p style="color: #64748b; font-style: italic;">No targets listed for today yet.</p>`;
    }

    try {
      const { transporter, isCustomSmtp, fromAddress } = await getEmailTransporter();

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px;">
          <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">${subject}</h1>
            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">StudyTrack Daily Reminder</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 15px; color: #1e293b;">Hi <strong>${userName || 'Student'}</strong>,</p>
            
            ${
              reminderType === 'morning'
                ? `<p style="font-size: 14px; color: #475569;">Good morning! Here is your study target list for today. Stay focused and conquer your goals!</p>`
                : reminderType === 'evening'
                ? `<p style="font-size: 14px; color: #475569;">Evening check-in! You have <strong>${pendingTasks.length}</strong> pending target(s). Keep pushing!</p>`
                : `<p style="font-size: 14px; color: #475569;">Day wrap-up! You completed <strong>${completedTasks.length}</strong> target(s) today. Unfinished tasks can be carried forward tomorrow!</p>`
            }

            <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #f1f5f9; padding: 10px 14px; font-weight: bold; font-size: 13px; color: #334155;">
                Today's Targets (${tasks?.length || 0})
              </div>
              ${taskListHtml}
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Open StudyTrack App
              </a>
            </div>
          </div>
        </div>
      `;

      if (transporter) {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: `📚 ${subject}`,
          html: htmlContent,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);

        return res.json({
          success: true,
          smtpConfigured: isCustomSmtp,
          mode: isCustomSmtp ? 'smtp' : 'ethereal',
          previewUrl: previewUrl || null,
          message: isCustomSmtp
            ? `${reminderType.toUpperCase()} reminder sent to ${toEmail}!`
            : `${reminderType.toUpperCase()} reminder dispatched to Ethereal sandbox! Click preview URL to view email.`,
        });
      } else {
        return res.json({
          success: true,
          smtpConfigured: false,
          mode: 'simulation',
          message: `${reminderType.toUpperCase()} reminder dispatched in simulation mode. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to deliver emails to real inboxes.`,
        });
      }
    } catch (error: any) {
      console.error('Email dispatch error:', error?.message || error);
      return res.json({
        success: false,
        message: `Could not send email: ${error?.message || 'Transport error'}. Please verify SMTP credentials.`,
      });
    }
  });

  // Development vs Production setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyTrack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
