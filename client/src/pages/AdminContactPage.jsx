import React, { useState, useEffect } from 'react';
// import { useAuth } from '@/hooks/useAuth';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Mail, 
  MailOpen, 
  Reply, 
  CheckCircle, 
  Circle, 
  AlertCircle,
  Clock,
  Search,
  Filter,
  Send,
  Trash2,
  Eye,
  Calendar,
  User,
  MessageSquare,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { customAxios } from '@/components/config/axios';
import { useAuthStore } from '@/store/useAuthStore';

const AdminContactPage = () => {
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: ''
  });

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user]);

  // Fetch contacts and stats
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchContacts();
      fetchStats();
    }
  }, [user, currentPage, filters]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.priority && filters.priority !== 'all' && { priority: filters.priority }),
        ...(filters.search && { search: filters.search })
      });

      const response = await customAxios.get(`/contact/admin?${params}`);

      if (response.data.success) {
        setContacts(response.data.data.messages);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await customAxios.get(`/contact/admin/stats`);

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusChange = async (contactId, newStatus) => {
    try {
      await customAxios.patch(`/contact/admin/${contactId}/status`, {
        status: newStatus
      });

      fetchContacts();
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (contactId, newPriority) => {
    try {
      await customAxios.patch(`/contact/admin/${contactId}/status`, {
        priority: newPriority
      });

      fetchContacts();
      toast.success('Priority updated successfully');
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleReply = async (contactId) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      setSending(true);
      await customAxios.post(`/contact/admin/${contactId}/reply`, {
        message: replyText
      });

      setReplyText('');
      fetchContacts();
      if (selectedContact) {
        // Refresh the selected contact details
        const response = await customAxios.get(`/contact/admin/${contactId}`);
        if (response.data.success) {
          setSelectedContact(response.data.data);
        }
      }
      toast.success('Reply sent successfully');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact message?')) {
      return;
    }

    try {
      await customAxios.delete(`/contact/admin/${contactId}`);

      fetchContacts();
      setSelectedContact(null);
      toast.success('Contact message deleted successfully');
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact message');
    }
  };

  const viewContactDetails = async (contactId) => {
    try {
      const response = await customAxios.get(`/contact/admin/${contactId}`);

      if (response.data.success) {
        setSelectedContact(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
      toast.error('Failed to load contact details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'read': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'replied': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'resolved': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <Mail className="h-4 w-4" />;
      case 'read': return <MailOpen className="h-4 w-4" />;
      case 'replied': return <Reply className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'low': return <Circle className="h-4 w-4 text-green-500" />;
      default: return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Messages</h1>
        <p className="text-muted-foreground">Manage and respond to contact form submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{stats.overview?.total || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{stats.overview?.unread || 0}</p>
              </div>
              <Mail className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{stats.overview?.thisWeek || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{stats.overview?.thisMonth || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value === 'all' ? '' : value })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contact Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contact Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-6 bg-muted rounded w-16"></div>
                        <div className="h-6 bg-muted rounded w-20"></div>
                        <div className="h-4 bg-muted rounded w-24"></div>
                      </div>
                      <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="flex gap-4 mb-3">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-4 bg-muted rounded w-40"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded w-5/6"></div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <div className="h-8 bg-muted rounded w-24"></div>
                      <div className="h-8 bg-muted rounded w-20"></div>
                      <div className="h-8 bg-muted rounded w-8"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contact messages found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {filters.search || filters.status !== 'all' || filters.priority !== 'all' 
                  ? 'Try adjusting your filters to see more messages.'
                  : 'Contact messages will appear here when users submit the contact form.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact._id} className="border border-border rounded-lg p-4 hover:bg-muted/30 hover:border-primary/30 transition-all duration-200 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header with status, priority, and timestamp */}
                      <div className="flex items-center gap-3 mb-3">
                        <Badge 
                          variant={contact.status === 'new' ? 'default' : 'secondary'}
                          className={`${getStatusColor(contact.status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(contact.status)}
                          <span className="capitalize">{contact.status}</span>
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`${getPriorityColor(contact.priority)} flex items-center gap-1`}
                        >
                          {getPriorityIcon(contact.priority)}
                          <span className="capitalize">{contact.priority}</span>
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(contact.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                        {contact.replies && contact.replies.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {contact.replies.length} {contact.replies.length === 1 ? 'reply' : 'replies'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Subject */}
                      <h3 className="font-semibold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                        {contact.subject}
                      </h3>
                      
                      {/* Contact Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {contact.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span className="break-all">{contact.email}</span>
                        </span>
                      </div>
                      
                      {/* Message Preview */}
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {contact.message}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Select 
                        value={contact.status} 
                        onValueChange={(value) => handleStatusChange(contact._id, value)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="replied">Replied</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={contact.priority} 
                        onValueChange={(value) => handlePriorityChange(contact._id, value)}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 opacity-60 group-hover:opacity-100 transition-opacity"
                            onClick={() => viewContactDetails(contact._id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                          <DialogHeader className="border-b pb-4">
                            <DialogTitle className="flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              Contact Message Details
                            </DialogTitle>
                            <DialogDescription>
                              View and reply to contact message from {selectedContact?.name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="flex-1 overflow-y-auto">
                            {selectedContact && (
                              <div className="space-y-6 p-1">
                                {/* Contact Info Card */}
                                <Card className="bg-muted/30">
                                  <CardContent className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                                          <p className="text-sm font-medium mt-1 text-foreground">{selectedContact.name}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                                          <p className="text-sm mt-1 break-all text-foreground">{selectedContact.email}</p>
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                                          <div className="mt-1">
                                            <Badge className={getStatusColor(selectedContact.status)}>
                                              {selectedContact.status}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
                                          <div className="mt-1">
                                            <Badge className={getPriorityColor(selectedContact.priority)}>
                                              {selectedContact.priority}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Original Message */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-lg text-foreground">{selectedContact.subject}</CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                      Received on {format(new Date(selectedContact.createdAt), 'MMMM d, yyyy at h:mm a')}
                                    </p>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="bg-card border rounded-lg p-4">
                                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                        {selectedContact.message}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Replies */}
                                {selectedContact.replies && selectedContact.replies.length > 0 && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                                        <Reply className="h-5 w-5" />
                                        Replies ({selectedContact.replies.length})
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-4">
                                        {selectedContact.replies.map((reply, index) => (
                                          <div key={index} className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                  <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="text-sm font-medium">
                                                  {reply.sentBy?.name || 'Admin'}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {reply.emailSent && (
                                                  <Badge variant="outline" className="text-xs">
                                                    <Send className="h-3 w-3 mr-1" />
                                                    Email sent
                                                  </Badge>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                  {format(new Date(reply.sentAt), 'MMM d, yyyy HH:mm')}
                                                </span>
                                              </div>
                                            </div>
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                              {reply.message}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Reply Form */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg text-foreground">Send Reply</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      Your reply will be sent to {selectedContact.email}
                                    </p>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-4">
                                      <Textarea
                                        placeholder="Type your reply here..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        rows={6}
                                        className="resize-none"
                                      />
                                      <div className="flex justify-between items-center">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDelete(selectedContact._id)}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Message
                                        </Button>
                                        <Button
                                          onClick={() => handleReply(selectedContact._id)}
                                          disabled={sending || !replyText.trim()}
                                          className="min-w-[120px]"
                                        >
                                          {sending ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                              Sending...
                                            </>
                                          ) : (
                                            <>
                                              <Send className="h-4 w-4 mr-2" />
                                              Send Reply
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(contact._id)}
                        className="h-8 text-destructive hover:text-destructive opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2"
              >
                <span>Previous</span>
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({contacts.length} of {stats.overview?.total || 0} messages)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2"
              >
                <span>Next</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContactPage;
