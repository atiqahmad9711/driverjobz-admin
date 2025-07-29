import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/util/trpc";
import { formValueSchema } from "@/schemas/form-values";
import { zodResolver } from "@hookform/resolvers/zod";
import { Switch } from "@radix-ui/react-switch";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm, SubmitHandler, Form } from "react-hook-form";
import { z } from "zod";

// Use the schema type directly from our shared schema
type FormValues = z.infer<typeof formValueSchema>;

// Create a form-specific schema that matches our form requirements
const formSchema = formValueSchema.extend({
  // Add any additional form-specific validations if needed
}).omit({
  // Remove fields that are handled by the server
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Form Component
const FormValuesData = ({ formValue }: { formValue: FormValues }) => {

  const categories = trpc.category.getCategories.useQuery({});
  const utils = trpc.useUtils();
  
  const updateFormValue = trpc.formValues.update.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.formValues.getById.invalidate();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      formValueId: formValue.formValueId,
      formValueSlug: formValue.formValueSlug || "",
      formFieldId: formValue.formFieldId || undefined,
      valueEn: formValue.valueEn || "",
      valueEs: formValue.valueEs || "",
      descriptionEn: formValue.descriptionEn || "",
      descriptionEs: formValue.descriptionEs || "",
      isActive: formValue.isActive ?? true,
      groupEn: formValue.groupEn || "",
      groupEs: formValue.groupEs || "",
      inCategorySlug: Array.isArray(formValue.inCategorySlug)
        ? formValue.inCategorySlug
        : formValue.inCategorySlug
        ? [formValue.inCategorySlug]
        : [],
      type: formValue.type || "",
      rank: formValue.rank || 0,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      // Convert form data to match the expected input type
      const updateData = {
        formValueId: data.formValueId, // No need to parse, already the correct type
        valueEn: data.valueEn,
        valueEs: data.valueEs,
        descriptionEn: data.descriptionEn,
        descriptionEs: data.descriptionEs,
        isActive: data.isActive,
        groupEn: data.groupEn,
        groupEs: data.groupEs,
        inCategorySlug: data.inCategorySlug,
        type: data.type,
        rank: data.rank,
        // Include other fields that might be needed for the update
        formValueSlug: data.formValueSlug,
        formFieldId: data.formFieldId,
      };

      await updateFormValue.mutateAsync(updateData);
      // Show success message
      alert("Form value updated successfully!");
    } catch (error) {
      console.error("Error updating form value:", error);
      // Show error message to user
      alert("Failed to update form value. Please try again.");
    }
  };

  // Reset form when formValue changes
  useEffect(() => {
    const defaultValues: FormValues = {
      formValueId: formValue.formValueId,
      formValueSlug: formValue.formValueSlug || "",
      formFieldId: formValue.formFieldId,
      valueEn: formValue.valueEn || "",
      valueEs: formValue.valueEs || "",
      descriptionEn: formValue.descriptionEn || "",
      descriptionEs: formValue.descriptionEs || "",
      isActive: formValue.isActive ?? true,
      groupEn: formValue.groupEn || "",
      groupEs: formValue.groupEs || "",
      inCategorySlug: Array.isArray(formValue.inCategorySlug)
        ? formValue.inCategorySlug
        : formValue.inCategorySlug
        ? [formValue.inCategorySlug]
        : [],
      type: formValue.type || "",
      rank: formValue.rank || 0,
    };
    form.reset(defaultValues);
  }, [formValue, form]);

  return (
      <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        {/* form value id with read only input field */}
        <div className="space-y-2">
          <Label>Form Value ID</Label>
          <Input value={formValue.formValueId} disabled />
        </div>
        <div className="space-y-2">
          <Label>EN</Label>
          <Input {...form.register("valueEn")} />
        </div>
        <div className="space-y-2">
          <Label>ES</Label>
          <Input {...form.register("valueEs")} />
        </div>
        <div className="space-y-2 flex items-center gap-2">
          <Switch
            id="isActive"
            checked={form.watch("isActive")}
            onCheckedChange={(checked) => form.setValue("isActive", checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
        <div className="space-y-2">
          <Label>Group EN</Label>
          <Input {...form.register("groupEn")} />
        </div>
        <div className="space-y-2">
          <Label>Group ES</Label>
          <Input {...form.register("groupEs")} />
        </div>
        <div className="space-y-2">
          <Label>Categories</Label>
          <Select
            value={form.watch("inCategorySlug")?.[0] || ""}
            onValueChange={(value) => {
              if (!form.watch("inCategorySlug").includes(value)) {
                form.setValue("inCategorySlug", [...form.watch("inCategorySlug"), value]);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.data?.map((category) => (
                <SelectItem key={category.slug} value={category.slug}>
                  {category.translations[0].name} ({category.slug})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.watch("inCategorySlug")?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.watch("inCategorySlug").map((slug: string) => {
                const category = categories.data?.find(c => c.slug === slug);
                return (
                  <span
                    key={slug}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {category?.translations[0].name || slug}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        form.setValue(
                          "inCategorySlug",
                          form.watch("inCategorySlug").filter((s: string) => s !== slug)
                        );
                      }}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 hover:bg-primary/30"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Input {...form.register("type")} />
        </div>
        <div className="space-y-2">
          <Label>Rank</Label>
          <Input
            type="number"
            {...form.register("rank", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>Created</Label>
          <Input value={formValue?.createdAt?.toString()} disabled />
        </div>
        <div className="space-y-2">
          <Label>Updated</Label>
          <Input value={formValue?.updatedAt?.toString()} disabled />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>EN Description</Label>
          <Input {...form.register("descriptionEn")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>ES Description</Label>
          <Input {...form.register("descriptionEs")} />
        </div>
        {formValue.deletedAt && (
          <div className="space-y-2">
            <Label>Deleted</Label>
            <Input value={formValue.deletedAt?.toString()} disabled />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
      </form>
  );
};

export default FormValuesData;
