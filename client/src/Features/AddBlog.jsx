import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { format, set, parse } from "date-fns";
import {
  ImageIcon,
  Tags,
  Upload,
  Users2,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MultiSelect from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBlog } from "@/components/api/blog";
import { toast } from "sonner";
import { CKEditorComp } from "@/components/ckEditor";
import useCategoryTagStore from "@/store/useCategoryTagStore";
import { DateHelper } from "@/components/helper/dateHelper";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API;

const blogSchema = z.object({
  title: z.string().min(12, "Title must be at least 12 characters"),
  image: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, "Max image size is 5MB")
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .png and .webp formats are supported"
    ),
  status: z.enum(["published", "scheduled"]),
  scheduledPublishDate: z.date().optional().nullable(),
  scheduledPublishTime: z.string().optional().nullable(),
});

const BlogForm = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [desc, setDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [timeOptions, setTimeOptions] = useState([]);
  const totalSteps = 3;

  const { categories, tags } = useCategoryTagStore();

  const transformedCategories = categories.map((category) => ({
    value: category._id,
    label: category.name,
  }));

  const transformedTags = tags.map((tag) => ({
    value: tag._id,
    label: tag.name,
  }));

  const form = useForm({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      title: "",
      content: "",
      status: "published",
      scheduledPublishDate: null,
      scheduledPublishTime: "12:00",
    },
    mode: "onChange",
  });

  const { watch, setValue, clearErrors, reset, formState } = form;
  const status = watch("status");
  const title = watch("title");
  const image = watch("image");
  const scheduledDate = watch("scheduledPublishDate");
  const scheduledTime = watch("scheduledPublishTime");

  const steps = [
    {
      title: "Basic Information",
      description: "Add title and featured image",
      isComplete: () => form.formState.dirtyFields.title && image,
    },
    {
      title: "Content",
      description: "Write your blog content",
      isComplete: () => desc.length > 20,
    },
    {
      title: "Categories & Publishing",
      description: "Add tags and set publishing options",
      isComplete: () =>
        selectedCategories.length > 0 &&
        selectedTags.length > 0 &&
        (status !== "scheduled" || (scheduledDate && scheduledTime)),
    },
  ];

  useEffect(() => {
    if (status === "published") {
      setValue("scheduledPublishDate", null);
      setValue("scheduledPublishTime", null);
    }
  }, [status, setValue]);

  const generateTimeOptions = () => {
    const options = [];
    const now = new Date();
    const isToday =
      scheduledDate &&
      scheduledDate.getDate() === now.getDate() &&
      scheduledDate.getMonth() === now.getMonth() &&
      scheduledDate.getFullYear() === now.getFullYear();

    let startHour = isToday ? now.getHours() : 0;
    let startMinute =
      isToday && startHour === now.getHours()
        ? Math.ceil(now.getMinutes() / 30) * 30
        : 0;

    if (startMinute >= 60) {
      startHour += 1;
      startMinute = 0;
    }

    for (let hour = startHour; hour < 24; hour++) {
      for (
        let minute = hour === startHour ? startMinute : 0;
        minute < 60;
        minute += 30
      ) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        const timeString = `${formattedHour}:${formattedMinute}`;
        options.push(timeString);
      }
    }

    return options;
  };

  useEffect(() => {
    setTimeOptions(generateTimeOptions());
  }, [scheduledDate]);

  useEffect(() => {
    const now = new Date();
    const isToday =
      scheduledDate &&
      scheduledDate.getDate() === now.getDate() &&
      scheduledDate.getMonth() === now.getMonth() &&
      scheduledDate.getFullYear() === now.getFullYear();

    if (isToday && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      if (
        hours < now.getHours() ||
        (hours === now.getHours() && minutes <= now.getMinutes())
      ) {
        const nextTime = new Date();
        nextTime.setMinutes(nextTime.getMinutes() + 30);
        nextTime.setMinutes(Math.ceil(nextTime.getMinutes() / 30) * 30);

        const nextTimeString = `${nextTime
          .getHours()
          .toString()
          .padStart(2, "0")}:${nextTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        setValue("scheduledPublishTime", nextTimeString);
      }
    }
  }, [scheduledDate, scheduledTime, setValue]);

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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("image", file);
      clearErrors("image");
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setValue("image", null);
    setImagePreview(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setValue("image", file);
      clearErrors("image");
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return title?.length >= 12 && !!image;
    } else if (currentStep === 2) {
      return desc.length >= 20;
    }
    return true;
  };

  const combineDateTime = (date, timeString) => {
    if (!date || !timeString) return null;

    const [hours, minutes] = timeString.split(":").map(Number);

    return set(date, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      let imageUrl = null;

      if (data.image) {
        imageUrl = await uploadToImgBB(data.image);
      }

      let publishDateTime = null;
      if (
        data.status === "scheduled" &&
        data.scheduledPublishDate &&
        data.scheduledPublishTime
      ) {
        publishDateTime = combineDateTime(
          data.scheduledPublishDate,
          data.scheduledPublishTime
        );
      }

      const res = await createBlog({
        title: data.title,
        content: desc,
        tags: selectedTags,
        category: selectedCategories,
        image: imageUrl,
        scheduledPublishDate:
          publishDateTime && DateHelper.toUTC(publishDateTime),
      });
      toast.success(res.data.message);

      reset();
      setSelectedCategories([]);
      setSelectedTags([]);
      setImagePreview(null);
      setDesc("");
      setCurrentStep(1);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit blog post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div
              className={`flex flex-col items-center ${
                index + 1 === currentStep
                  ? "text-primary"
                  : index + 1 < currentStep || step.isComplete()
                  ? "text-green-500"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  index + 1 === currentStep
                    ? "border-primary bg-primary/10"
                    : index + 1 < currentStep || step.isComplete()
                    ? "border-green-500 bg-green-500/10"
                    : "border-muted bg-muted/10"
                }`}
              >
                {index + 1 < currentStep || step.isComplete() ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="text-xs mt-2 font-medium">{step.title}</div>
              <div className="text-xs max-w-[100px] text-center">
                {step.description}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 ${
                  index + 1 < currentStep ? "bg-green-500" : "bg-muted"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blog Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter an engaging title..."
                      className="text-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-6">
              <FormLabel>Featured Image</FormLabel>
              <div
                className={`border-2 border-dashed rounded-lg transition-colors h-[300px] mt-2 ${
                  isDragging ? "border-primary" : "border-muted"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="relative h-full">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 z-10"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="rounded-lg object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <Upload className="w-16 h-16 mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground mb-2">
                      Drag and drop your image here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">or</p>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => document.getElementById("image").click()}
                      size="sm"
                      className="px-6"
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
              <FormMessage>{form.formState.errors.image?.message}</FormMessage>
              <p className="text-xs text-muted-foreground mt-2">
                Accepted formats: JPG, PNG, WebP. Max size: 5MB
              </p>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <FormItem>
              <FormLabel>Blog Content</FormLabel>
              <div className="min-h-[400px] border rounded-md">
                <CKEditorComp content={desc} setContent={setDesc} />
              </div>
              {desc.length < 20 && (
                <p className="text-xs text-destructive mt-2">
                  Please add meaningful content to your blog post
                </p>
              )}
            </FormItem>
          </>
        );
      case 3:
        return (
          <>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <FormLabel>Category</FormLabel>
                <div className="mt-2">
                  <MultiSelect
                    options={transformedCategories}
                    onValueChange={setSelectedCategories}
                    placeholder="Select a category."
                    maxCount={1}
                    value={selectedCategories}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You can select only one category
                </p>
                {selectedCategories.length === 0 && (
                  <p className="text-xs text-destructive mt-1">
                    Please select a category
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Tags</FormLabel>
                <div className="mt-2">
                  <MultiSelect
                    options={transformedTags}
                    onValueChange={setSelectedTags}
                    placeholder="Select up to 3 tags..."
                    maxCount={3}
                    value={selectedTags}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You can select up to 3 tags
                </p>
                {selectedTags.length === 0 && (
                  <p className="text-xs text-destructive mt-1">
                    Please select at least one tag
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publishing Options</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="published">Publish Now</SelectItem>
                          <SelectItem value="scheduled">Schedule</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {status === "scheduled" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="scheduledPublishDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const maxDate = new Date();
                                maxDate.setDate(maxDate.getDate() + 7);
                                maxDate.setHours(23, 59, 59, 999);

                                return date < today || date > maxDate;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledPublishTime"
                    render={({ field }) => {
                      let timeValue;
                      try {
                        timeValue = field.value
                          ? parse(field.value, "HH:mm", new Date())
                          : new Date();
                      } catch (error) {
                        timeValue = new Date();
                        const formattedTime = format(timeValue, "HH:mm");
                        field.onChange(formattedTime);
                      }

                      const hours24 = timeValue.getHours();
                      const is12HourFormat = hours24 >= 12 ? "PM" : "AM";
                      const hours12 = hours24 % 12 || 12;
                      const minutes = timeValue.getMinutes();

                      const updateTime = (
                        newHours12,
                        newMinutes,
                        newPeriod
                      ) => {
                        const hours24Format =
                          newPeriod === "PM" && newHours12 < 12
                            ? newHours12 + 12
                            : newPeriod === "AM" && newHours12 === 12
                            ? 0
                            : newHours12;

                        const newTimeString = `${hours24Format
                          .toString()
                          .padStart(2, "0")}:${newMinutes
                          .toString()
                          .padStart(2, "0")}`;
                        field.onChange(newTimeString);
                      };

                      return (
                        <FormItem>
                          <FormLabel>Schedule Time</FormLabel>
                          <div className="flex space-x-2">
                            <Select
                              value={hours12.toString()}
                              onValueChange={(value) =>
                                updateTime(
                                  parseInt(value),
                                  minutes,
                                  is12HourFormat
                                )
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-[80px]">
                                  <SelectValue placeholder="Hour" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1)
                                  .filter((hour) => {

                                    if (
                                      !scheduledDate ||
                                      scheduledDate.getDate() !==
                                        new Date().getDate() ||
                                      scheduledDate.getMonth() !==
                                        new Date().getMonth() ||
                                      scheduledDate.getFullYear() !==
                                        new Date().getFullYear()
                                    ) {
                                      return true;
                                    }

                                    const now = new Date();
                                    const currentHour = now.getHours();
                                    const isPM = is12HourFormat === "PM";


                                    const hour24 = isPM
                                      ? hour === 12
                                        ? 12
                                        : hour + 12
                                      : hour === 12
                                      ? 0
                                      : hour;


                                      if (
                                      (currentHour >= 12 && !isPM) ||
                                      (currentHour < 12 && isPM)
                                    ) {
                                      return true; 
                                    }


                                    return hour24 >= currentHour;
                                  })
                                  .map((hour) => (
                                    <SelectItem
                                      key={hour}
                                      value={hour.toString()}
                                    >
                                      {hour}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={minutes.toString()}
                              onValueChange={(value) =>
                                updateTime(
                                  hours12,
                                  parseInt(value),
                                  is12HourFormat
                                )
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-[80px]">
                                  <SelectValue placeholder="Min" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px] overflow-y-auto">
                                {Array.from({ length: 60 }, (_, i) => i)
                                  .filter((minute) => {

                                    if (
                                      !scheduledDate ||
                                      scheduledDate.getDate() !==
                                        new Date().getDate() ||
                                      scheduledDate.getMonth() !==
                                        new Date().getMonth() ||
                                      scheduledDate.getFullYear() !==
                                        new Date().getFullYear()
                                    ) {
                                      return true;
                                    }

                                    const now = new Date();
                                    const currentHour = now.getHours();
                                    const currentMinute = now.getMinutes();
                                    const isPM = is12HourFormat === "PM";


                                    const selectedHour24 = isPM
                                      ? hours12 === 12
                                        ? 12
                                        : hours12 + 12
                                      : hours12 === 12
                                      ? 0
                                      : hours12;


                                      if (selectedHour24 === currentHour) {
                                      return minute > currentMinute;
                                    }


                                    return true;
                                  })
                                  .map((minute) => (
                                    <SelectItem
                                      key={minute}
                                      value={minute.toString()}
                                    >
                                      {minute.toString().padStart(2, "0")}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={is12HourFormat}
                              onValueChange={(value) =>
                                updateTime(hours12, minutes, value)
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-[80px]">
                                  <SelectValue placeholder="AM/PM" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {["AM", "PM"]
                                  .filter((period) => {

                                    if (
                                      !scheduledDate ||
                                      scheduledDate.getDate() !==
                                        new Date().getDate() ||
                                      scheduledDate.getMonth() !==
                                        new Date().getMonth() ||
                                      scheduledDate.getFullYear() !==
                                        new Date().getFullYear()
                                    ) {
                                      return true;
                                    }

                                    const now = new Date();
                                    const currentHour = now.getHours();


                                    return !(
                                      period === "AM" && currentHour >= 12
                                    );
                                  })
                                  .map((period) => (
                                    <SelectItem key={period} value={period}>
                                      {period}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <FormMessage />
                          {scheduledDate &&
                            scheduledDate.getDate() === new Date().getDate() &&
                            scheduledDate.getMonth() ===
                              new Date().getMonth() &&
                            scheduledDate.getFullYear() ===
                              new Date().getFullYear() && (
                              <p className="text-xs text-muted-foreground mt-1">
                                For today, only future times can be selected
                              </p>
                            )}
                        </FormItem>
                      );
                    }}
                  />
                </div>
              )}

              {status === "scheduled" && scheduledDate && scheduledTime && (
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-md">
                  <h3 className="text-sm font-medium mb-2">
                    Publishing Schedule
                  </h3>
                  <p className="text-sm flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    Blog will be published on{" "}
                    <span className="font-medium ml-1 text-primary">
                      {format(scheduledDate, "MMMM d, yyyy")} at{" "}
                      {format(
                        parse(scheduledTime, "HH:mm", new Date()),
                        "h:mm a"
                      )}
                    </span>
                  </p>
                  {/* <p className="text-xs text-muted-foreground mt-2">
                    {new Date().toLocaleTimeString([], { timeZoneName: 'short' })} in your local time
                  </p> */}
                </div>
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === totalSteps;
  const canSubmit =
    isLastStep &&
    selectedCategories.length > 0 &&
    selectedTags.length > 0 &&
    (status !== "scheduled" ||
      (form.watch("scheduledPublishDate") &&
        form.watch("scheduledPublishTime")));

  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100dvh-80px)]">
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-2xl font-bold text-center">
            Create Blog Post
          </CardTitle>
        </CardHeader>

        {renderStepIndicator()}

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {renderStepContent()}
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={!canSubmit || isSubmitting}
              className="w-32"
            >
              {isSubmitting ? "Submitting..." : "Submit Blog"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!canProceedToNextStep()}
              className="w-32"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default BlogForm;
