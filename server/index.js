const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*', 
  credentials: true
}));
app.use(express.json());

// Supabase Admin Client (requires SERVICE_ROLE_KEY)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Nodemailer transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASS
  }
});

// Helper to extract filename from Supabase Public URL
const getFilePathFromUrl = (url, bucket) => {
  if (!url) return null;
  const parts = url.split(`${bucket}/`);
  return parts.length > 1 ? parts[1] : null;
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QuadSwap server is running' });
});

// POST /api/reject-user — Comprehensive rejection (Auth Delete + Storage Delete + Email)
app.post('/api/reject-user', async (req, res) => {
  try {
    const { userId, userEmail, userName, rejectionReason, profilePicUrl, idUploadUrl } = req.body;

    if (!userId || !userEmail || !rejectionReason) {
      return res.status(400).json({ error: 'Missing required fields: userId, userEmail, rejectionReason' });
    }

    console.log(`\n--- Starting COMPREHENSIVE REJECTION for: ${userEmail} (${userId}) ---`);

    // 1. Delete Storage Files (Avatar & ID Document)
    const avatarPath = getFilePathFromUrl(profilePicUrl, 'avatars');
    const docPath = getFilePathFromUrl(idUploadUrl, 'documents');

    if (avatarPath) {
      console.log(`Deleting avatar: ${avatarPath}`);
      const { error: avatarErr } = await supabaseAdmin.storage.from('avatars').remove([avatarPath]);
      if (avatarErr) console.warn('Avatar storage delete failed:', avatarErr.message);
    }

    if (docPath) {
      console.log(`Deleting document: ${docPath}`);
      const { error: docErr } = await supabaseAdmin.storage.from('documents').remove([docPath]);
      if (docErr) console.warn('Document storage delete failed:', docErr.message);
    }

    // 2. Delete user from Supabase Auth (Admin action)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Auth delete error (Check your SERVICE_ROLE_KEY):', authError.message);
      // We don't throw yet, maybe the email can still go through
    } else {
      console.log('Successfully deleted user from Supabase Auth');
    }

    // 3. Delete from 'users' table (Just in case client-side failed or was skipped)
    const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', userId);
    if (dbError) console.warn('DB delete warning (may have been deleted client-side):', dbError.message);

    // 4. Send rejection email
    try {
      await transporter.sendMail({
        from: `"QuadSwap Admin" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'QuadSwap Account Verification - Rejected',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 2rem; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #818CF8 100%); padding: 2rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem;">
              <h1 style="color: white; margin: 0; font-size: 1.5rem;">QuadSwap</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 0.5rem 0 0 0; font-size: 0.85rem;">Campus Marketplace</p>
            </div>
            <div style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin: 0 0 1rem 0;">Hi ${userName || 'User'},</h2>
              <p style="color: #64748b; line-height: 1.6;">
                We regret to inform you that your account verification on <strong>QuadSwap</strong> has been <span style="color: #ef4444; font-weight: 700;">rejected</span>.
              </p>
              <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                <p style="color: #991b1b; font-weight: 700; margin: 0 0 0.5rem 0;">Reason for Rejection:</p>
                <p style="color: #dc2626; margin: 0;">${rejectionReason}</p>
              </div>
              <p style="color: #64748b; line-height: 1.6;">
                Your entire profile and uploaded documents have been removed from our secure storage. You are welcome to <strong>re-register</strong> with valid documentation.
              </p>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 0.75rem; margin-top: 1.5rem;">
              &copy; ${new Date().getFullYear()} QuadSwap Admin Team
            </p>
          </div>
        `
      });
      console.log(`Rejection email sent to ${userEmail}`);
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    res.json({ success: true, message: 'Comprehensive rejection complete (Auth, Storage, DB cleaned).' });
  } catch (err) {
    console.error('Rejection system error:', err.message);
    res.status(500).json({ error: 'Rejection failed: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`QuadSwap Server running on port ${PORT}`);
});
