# Contact System Setup Guide

## Overview
This contact system integrates with Brevo (formerly Sendinblue) SMTP service using Nodemailer for reliable email delivery. It provides a complete contact management solution with admin dashboard.

## Features
- ✅ Public contact form submission
- ✅ Email confirmation to users
- ✅ Admin email notifications
- ✅ Admin dashboard for message management
- ✅ Reply functionality with email sending
- ✅ Status and priority management
- ✅ Search and filtering
- ✅ Statistics dashboard
- ✅ Beautiful HTML email templates

## Setup Instructions

### 1. Brevo SMTP Configuration

1. **Create a Brevo Account:**
   - Visit [https://www.brevo.com/](https://www.brevo.com/)
   - Sign up for a free account (300 emails/day free tier)

2. **Get SMTP Credentials:**
   - Log in to your Brevo dashboard
   - Go to **Settings** → **SMTP & API**
   - Copy your SMTP credentials:
     - SMTP Server: `smtp-relay.brevo.com`
     - Port: `587`
     - Login: Your account email
     - Password: Your SMTP key (generate if needed)

3. **Update Environment Variables:**
   ```env
   # Brevo Email Service Configuration (SMTP)
   BREVO_SMTP_KEY=your_brevo_smtp_key_here
   BREVO_SMTP_USER=your_account_email@domain.com
   FROM_EMAIL=noreply@yourdomain.com
   ADMIN_EMAIL=admin@yourdomain.com
   FRONTEND_URL=http://localhost:5173
   ```

### 2. Backend Setup

The backend is already configured with:
- Contact message model with replies and status tracking
- Nodemailer integration with Brevo SMTP
- Admin routes with proper authentication
- Email templates for confirmations and replies

### 3. Frontend Setup

The admin contact page is already integrated into the admin dashboard:
- Access via `/admin/contacts`
- Requires admin role authentication
- Provides complete message management interface

### 4. Email Templates

Three email templates are included:

1. **User Confirmation Email** - Sent when user submits contact form
2. **Admin Notification Email** - Sent to admin when new message received
3. **Reply Email** - Sent when admin replies to a message

All templates are responsive and professionally designed.

## Usage

### For Users:
1. Visit the contact page
2. Fill out the contact form
3. Receive confirmation email
4. Admin will respond via email

### For Admins:
1. Access `/admin/contacts`
2. View all messages with filtering options
3. Change status and priority
4. Reply to messages directly
5. View statistics and analytics

## API Endpoints

### Public Routes:
- `POST /api/contact` - Submit contact form

### Admin Routes (require authentication):
- `GET /api/contact/admin` - Get all messages with pagination
- `GET /api/contact/admin/stats` - Get contact statistics
- `GET /api/contact/admin/:id` - Get specific message
- `POST /api/contact/admin/:id/reply` - Reply to message
- `PATCH /api/contact/admin/:id/status` - Update status/priority
- `DELETE /api/contact/admin/:id` - Delete message

## Database Schema

The ContactMessage model includes:
- Basic contact info (name, email, subject, message)
- Status tracking (new, read, replied, resolved)
- Priority levels (low, medium, high)
- Reply system with timestamps
- Admin tracking for read status
- IP address and user agent logging

## Security Features

- Rate limiting on contact form submissions
- Input validation and sanitization
- CSRF protection
- Admin authentication required for management
- Email content sanitization

## Troubleshooting

### Email Not Sending:
1. Check Brevo SMTP credentials
2. Verify SMTP key is active
3. Check email quota in Brevo dashboard
4. Review server logs for errors

### Admin Access Issues:
1. Ensure user has 'admin' role
2. Check authentication middleware
3. Verify JWT token validity

### Frontend Errors:
1. Check API endpoint URLs
2. Verify CORS configuration
3. Check network requests in browser dev tools

## Production Considerations

1. **Domain Verification:** Add your domain to Brevo for better deliverability
2. **Email Limits:** Monitor usage and upgrade plan if needed
3. **Error Handling:** Implement proper error logging
4. **Backup:** Regular database backups for contact messages
5. **Monitoring:** Set up alerts for failed email deliveries

## Support

For issues or questions:
1. Check Brevo documentation: [https://developers.brevo.com/](https://developers.brevo.com/)
2. Review application logs
3. Test email delivery with a simple test message
