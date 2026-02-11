/**
 * Email Service
 * Handles all email sending functionality
 */

const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // In development, just log the email
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      logger.info('Email would be sent:', { to, subject });
      logger.debug('Email content:', { html: html?.substring(0, 200) });
      return { success: true, messageId: 'dev-mock-id' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"NetGUARD Security" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully:', { to, subject, messageId: info.messageId });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email sending failed:', { to, subject, error: error.message });
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0c4b82; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .header { background: linear-gradient(135deg, #0c4b82, #76ccd6); padding: 40px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 40px; }
        .content h2 { color: #0c4b82; margin-top: 0; }
        .content p { color: #36393f; line-height: 1.6; }
        .button { display: inline-block; background: linear-gradient(135deg, #0c4b82, #76ccd6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 8px; margin-top: 20px; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 NetGUARD</h1>
        </div>
        <div class="content">
          <h2>Réinitialisation du mot de passe</h2>
          <p>Bonjour <strong>${userName}</strong>,</p>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte NetGUARD.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </p>
          <div class="warning">
            ⚠️ Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="${resetUrl}" style="color: #0c4b82; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} NetGUARD - Sécurité réseau intelligente</p>
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Réinitialisation du mot de passe NetGUARD

    Bonjour ${userName},

    Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte NetGUARD.

    Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
    ${resetUrl}

    Ce lien expire dans 1 heure.

    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

    © ${new Date().getFullYear()} NetGUARD
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Réinitialisation de votre mot de passe NetGUARD',
    html,
    text
  });
};

/**
 * Send welcome email after registration
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {string} verificationToken - Email verification token
 */
const sendWelcomeEmail = async (email, userName, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0c4b82; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .header { background: linear-gradient(135deg, #0c4b82, #76ccd6); padding: 40px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 40px; }
        .content h2 { color: #0c4b82; margin-top: 0; }
        .content p { color: #36393f; line-height: 1.6; }
        .button { display: inline-block; background: linear-gradient(135deg, #39ff14, #76ccd6); color: #0c4b82; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .features ul { margin: 0; padding-left: 20px; }
        .features li { margin: 10px 0; color: #36393f; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Bienvenue sur NetGUARD!</h1>
        </div>
        <div class="content">
          <h2>Salut ${userName} ! 🎉</h2>
          <p>Merci de rejoindre NetGUARD, votre solution de sécurité réseau intelligente.</p>
          <p>Pour activer votre compte et accéder à toutes les fonctionnalités, veuillez confirmer votre adresse email :</p>
          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">✅ Vérifier mon email</a>
          </p>
          <div class="features">
            <strong>Ce qui vous attend :</strong>
            <ul>
              <li>🔒 Protection en temps réel de votre réseau</li>
              <li>📊 Tableau de bord avec statistiques détaillées</li>
              <li>🚨 Alertes instantanées en cas de menaces</li>
              <li>💻 Gestion de tous vos appareils connectés</li>
            </ul>
          </div>
          <p>Des questions ? N'hésitez pas à contacter notre support.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} NetGUARD - Sécurité réseau intelligente</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Bienvenue sur NetGUARD!

    Salut ${userName}!

    Merci de rejoindre NetGUARD, votre solution de sécurité réseau intelligente.

    Pour activer votre compte, cliquez sur ce lien :
    ${verifyUrl}

    © ${new Date().getFullYear()} NetGUARD
  `;

  return sendEmail({
    to: email,
    subject: '🛡️ Bienvenue sur NetGUARD - Confirmez votre email',
    html,
    text
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
