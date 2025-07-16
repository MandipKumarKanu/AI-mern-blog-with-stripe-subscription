import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, BarChart3, ExternalLink, Eye, MousePointer, Play, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
// import { useAuthContext } from '@/hooks/useAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { customAxios } from '@/components/config/axios';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API;

const AdManagementPage = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    placement: 'sidebar',
    priority: '1',
    isActive: true,
    startDate: new Date(),
    endDate: null,
    image: null
  });

  const [imagePreview, setImagePreview] = useState(null);

  const uploadToImgBB = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      return data.data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const response = await customAxios.get('/ads');
      setAds(response.data.ads || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to fetch ads',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let imageUrl = formData.image;
      
      // If there's a new image file, upload it to ImgBB first
      if (formData.image && typeof formData.image === 'object') {
        imageUrl = await uploadToImgBB(formData.image);
      }
      
      const submitData = {
        title: formData.title,
        description: formData.description,
        link: formData.link,
        image: imageUrl,
        placement: formData.placement,
        priority: parseInt(formData.priority),
        isActive: formData.isActive,
        startDate: formData.startDate?.toISOString(),
        endDate: formData.endDate?.toISOString()
      };

      const url = editingAd ? `/ads/${editingAd._id}` : '/ads';
      const method = editingAd ? 'put' : 'post';
      
      const response = await customAxios[method](url, submitData);

      toast({
        title: 'Success',
        description: response.data.message
      });
      setDialogOpen(false);
      resetForm();
      fetchAds();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save ad',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description,
      link: ad.link,
      placement: ad.placement,
      priority: ad.priority.toString(),
      isActive: ad.isActive,
      startDate: new Date(ad.startDate),
      endDate: ad.endDate ? new Date(ad.endDate) : null,
      image: null
    });
    setImagePreview(ad.image);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      await customAxios.delete(`/ads/${id}`);
      toast({
        title: 'Success',
        description: 'Ad deleted successfully'
      });
      fetchAds();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete ad',
        variant: 'destructive'
      });
    }
  };

  const handleAnalytics = async (ad) => {
    try {
      const response = await customAxios.get(`/ads/${ad._id}/analytics`);
      setAnalytics(response.data);
      setAnalyticsOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics',
        variant: 'destructive'
      });
    }
  };

  const handlePreview = (ad) => {
    setPreviewAd(ad);
    setPreviewOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      link: '',
      placement: 'sidebar',
      priority: '1',
      isActive: true,
      startDate: new Date(),
      endDate: null,
      image: null
    });
    setImagePreview(null);
    setEditingAd(null);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Ad Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAd ? 'Edit Ad' : 'Create New Ad'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="link">Link URL</Label>
                  <Input
                    id="link"
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="image">Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingAd}
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded border" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="placement">Placement</Label>
                  <Select value={formData.placement} onValueChange={(value) => setFormData(prev => ({ ...prev, placement: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="inline">Inline</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? format(formData.endDate, "PPP") : "No end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAd ? 'Update Ad' : 'Create Ad'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Ads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-muted h-16 rounded"></div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad._id}>
                    <TableCell>
                      <img src={ad.image} alt={ad.title} className="w-12 h-12 object-cover rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{ad.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ad.placement}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ad.isActive ? "default" : "secondary"}>
                        {ad.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{ad.priority}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {ad.impressionCount || 0}
                        </div>
                        <div className="flex items-center">
                          <MousePointer className="h-3 w-3 mr-1" />
                          {ad.clickCount || 0}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handlePreview(ad)}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAnalytics(ad)}>
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(ad)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(ad.link, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(ad._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Analytics Dialog */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ad Analytics</DialogTitle>
          </DialogHeader>
          {analytics.ad && (
            <div className="space-y-4">
              <h3 className="font-semibold">{analytics.ad.title}</h3>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{analytics.analytics.impressions}</div>
                    <div className="text-sm text-muted-foreground">Impressions</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{analytics.analytics.clicks}</div>
                    <div className="text-sm text-muted-foreground">Clicks</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{analytics.analytics.ctr}</div>
                    <div className="text-sm text-muted-foreground">CTR</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ad Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {previewAd && (
            <div className="relative bg-card rounded-lg overflow-hidden">
              <div className="absolute top-2 right-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 hover:bg-background rounded-full h-8 w-8"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="cursor-pointer group">
                {/* Image */}
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={previewAd.image}
                    alt={previewAd.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Sponsored label */}
                  <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                    Sponsored (Preview)
                  </div>
                </div>

                {/* Text Content */}
                <div className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-2">
                    {previewAd.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {previewAd.description}
                  </p>
                  
                  {/* CTA Button */}
                  <div className="mt-4 flex justify-center">
                    <Button className="w-full">
                      Learn More
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bottom disclaimer */}
              <div className="px-6 pb-4">
                <p className="text-xs text-muted-foreground text-center">
                  This is a preview of how the {previewAd.placement} ad will appear
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdManagementPage;
