const ContactMessage = require('../models/ContactMessage');
const User = require('../models/User');
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: `"FutureBlog" <${process.env.EMAIL_SENDER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    });

    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
};

const createUserConfirmationEmail = (name, subject) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You - FutureBlog</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Thank You!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">We've received your message</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6;">Thank you for reaching out to FutureBlog! We've successfully received your message and our team will review it shortly.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0; font-size: 16px;">Your Message Summary:</h3>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">We typically respond within 24-48 hours. If your inquiry is urgent, please don't hesitate to reach out to us directly.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Visit FutureBlog
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
            This email was sent from FutureBlog. If you didn't submit this form, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const createAdminNotificationEmail = (name, email, subject, message) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Message - FutureBlog</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">New Contact Message</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">FutureBlog Contact Form</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">New Message Details</h2>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0; color: #374151;"><strong>From:</strong> ${name}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Message:</h3>
            <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/contacts" 
               style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View in Admin Panel
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const createReplyEmail = (contactMessage, replyMessage, adminName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reply from FutureBlog Team</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">FutureBlog Team Response</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Re: ${contactMessage.subject}</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${contactMessage.name},</h2>
          
          <div style="color: #4b5563; line-height: 1.6; margin: 20px 0; padding: 20px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
            ${replyMessage.replace(/\n/g, '<br>')}
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #374151; margin-top: 0; font-size: 16px;">Your Original Message:</h3>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Subject:</strong> ${contactMessage.subject}</p>
            <p style="color: #6b7280; line-height: 1.5; margin-top: 10px; white-space: pre-wrap;">${contactMessage.message}</p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">If you have any follow-up questions, feel free to reply to this email or submit a new contact form on our website.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Visit FutureBlog
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
            Best regards,<br>
            ${adminName || 'The FutureBlog Team'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }


    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress,
      userAgent
    });

    const userConfirmationHtml = createUserConfirmationEmail(name, subject);
    await sendEmail(email, 'Thank you for contacting FutureBlog!', userConfirmationHtml);

    const adminNotificationHtml = createAdminNotificationEmail(name, email, subject, message);
    const adminEmail = process.env.ADMIN_EMAIL || 'mandipshah3@gmail.com';
    await sendEmail(adminEmail, `New Contact Message: ${subject}`, adminNotificationHtml);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.',
      data: {
        id: contactMessage._id,
        submittedAt: contactMessage.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
};

const getContactMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const messages = await ContactMessage
      .find(filter)
      .populate('readBy', 'name email')
      .populate('replies.sentBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    const totalMessages = await ContactMessage.countDocuments(filter);
    const totalPages = Math.ceil(totalMessages / parseInt(limit));

    const statusCounts = await ContactMessage.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusStats = {
      new: 0,
      read: 0,
      replied: 0,
      resolved: 0
    };

    statusCounts.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMessages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        stats: statusStats
      }
    });

  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact messages'
    });
  }
};

const getContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage
      .findById(req.params.id)
      .populate('readBy', 'name email')
      .populate('replies.sentBy', 'name email');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    if (message.status === 'new') {
      await message.markAsRead(req.user.id);
    }

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact message'
    });
  }
};

const replyToContactMessage = async (req, res) => {
  try {
    const { message: replyMessage } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    const contactMessage = await ContactMessage.findById(req.params.id);

    if (!contactMessage) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    const replyEmailHtml = createReplyEmail(contactMessage, replyMessage, req.user.name);

    const emailSent = await sendEmail(
      contactMessage.email,
      `Re: ${contactMessage.subject}`,
      replyEmailHtml
    );

    await contactMessage.addReply(replyMessage.trim(), req.user.id, emailSent);

    await contactMessage.populate('replies.sentBy', 'name email');

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: contactMessage
    });

  } catch (error) {
    console.error('Error replying to contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reply'
    });
  }
};

const updateContactMessageStatus = async (req, res) => {
  try {
    const { status, priority } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('readBy', 'name email').populate('replies.sentBy', 'name email');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });

  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating message'
    });
  }
};

const deleteContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message'
    });
  }
};

const getContactStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const totalMessages = await ContactMessage.countDocuments();
    const thisMonthMessages = await ContactMessage.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const thisWeekMessages = await ContactMessage.countDocuments({
      createdAt: { $gte: startOfWeek }
    });
    const unreadMessages = await ContactMessage.countDocuments({
      status: 'new'
    });

    const statusStats = await ContactMessage.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const priorityStats = await ContactMessage.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentActivity = await ContactMessage.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalMessages,
          thisMonth: thisMonthMessages,
          thisWeek: thisWeekMessages,
          unread: unreadMessages
        },
        statusDistribution: statusStats,
        priorityDistribution: priorityStats,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact statistics'
    });
  }
};

module.exports = {
  submitContactForm,
  getContactMessages,
  getContactMessage,
  replyToContactMessage,
  updateContactMessageStatus,
  deleteContactMessage,
  getContactStats
};
