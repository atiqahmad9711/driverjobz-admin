"use client";

import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoaderCircle, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type FormValues = {
  valueEn: string;
  valueEs: string;
  descriptionEn: string;
  descriptionEs: string;
  isActive: boolean;
  groupEn: string;
  groupEs: string;
  inCategorySlug: string[];
  type: string;
  rank: number;
};

const formSchema = z.object({
  valueEn: z.string(),
  valueEs: z.string(),
  descriptionEn: z.string(),
  descriptionEs: z.string(),
  isActive: z.boolean(),
  groupEn: z.string(),
  groupEs: z.string(),
  inCategorySlug: z.array(z.string()),
  type: z.string(),
  rank: z.number(),
}).required();

interface KeyValueProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

const KeyValue = ({ label, value, className = '' }: KeyValueProps) => (
  <p className={className}>
    <strong>{label}:</strong> {value}
  </p>
);

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/util/trpc";

// Form Component
const FormComponent = ({ formValue }: { formValue: any }) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any, // Type assertion to handle the resolver type
    defaultValues: {
      valueEn: formValue.valueEn || '',
      valueEs: formValue.valueEs || '',
      descriptionEn: formValue.descriptionEn || '',
      descriptionEs: formValue.descriptionEs || '',
      isActive: formValue.isActive || false,
      groupEn: formValue.groupEn || '',
      groupEs: formValue.groupEs || '',
      inCategorySlug: Array.isArray(formValue.inCategorySlug) 
        ? formValue.inCategorySlug 
        : [formValue.inCategorySlug || ''].filter(Boolean) as string[],
      type: formValue.type || '',
      rank: formValue.rank || 0,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log('Form submitted:', data);
  };

  // Reset form when formValue changes
  useEffect(() => {
    const defaultValues: FormValues = {
      valueEn: formValue.valueEn || '',
      valueEs: formValue.valueEs || '',
      descriptionEn: formValue.descriptionEn || '',
      descriptionEs: formValue.descriptionEs || '',
      isActive: formValue.isActive || false,
      groupEn: formValue.groupEn || '',
      groupEs: formValue.groupEs || '',
      inCategorySlug: Array.isArray(formValue.inCategorySlug) 
        ? formValue.inCategorySlug 
        : [formValue.inCategorySlug || ''].filter(Boolean),
      type: formValue.type || '',
      rank: formValue.rank || 0,
    };
    form.reset(defaultValues);
  }, [formValue, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <Label>EN</Label>
            <Input {...form.register('valueEn')} />
          </div>
          <div className="space-y-2">
            <Label>ES</Label>
            <Input {...form.register('valueEs')} />
          </div>
          <div className="space-y-2 flex items-center gap-2">
            <Switch
              id="isActive"
              checked={form.watch('isActive')}
              onCheckedChange={(checked) => form.setValue('isActive', checked)}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <div className="space-y-2">
            <Label>Group EN</Label>
            <Input {...form.register('groupEn')} />
          </div>
          <div className="space-y-2">
            <Label>Group ES</Label>
            <Input {...form.register('groupEs')} />
          </div>
          <div className="space-y-2">
            <Label>Categories</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {form.watch('inCategorySlug')?.length > 0
                    ? form.watch('inCategorySlug').join(', ')
                    : 'Select categories...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search categories..." />
                  <CommandEmpty>No categories found.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-y-auto">
                    {form.watch('inCategorySlug')?.map((slug: string) => (
                      <CommandItem
                        key={slug}
                        onSelect={() => {
                          form.setValue(
                            'inCategorySlug',
                            form.watch('inCategorySlug').filter((s: string) => s !== slug)
                          );
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          {slug}
                        </div>
                      </CommandItem>
                    ))}
                    <CommandItem
                      onSelect={() => {
                        const newCategory = prompt('Enter a new category:');
                        if (newCategory && !form.watch('inCategorySlug').includes(newCategory)) {
                          form.setValue('inCategorySlug', [...form.watch('inCategorySlug'), newCategory]);
                        }
                      }}
                      className="cursor-pointer text-muted-foreground"
                    >
                      + Add new category
                    </CommandItem>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.watch('inCategorySlug')?.map((slug: string) => (
                <span
                  key={slug}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {slug}
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue(
                        'inCategorySlug',
                        form.watch('inCategorySlug').filter((s: string) => s !== slug)
                      );
                    }}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 hover:bg-primary/30"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Input {...form.register('type')} />
          </div>
          <div className="space-y-2">
            <Label>Rank</Label>
            <Input type="number" {...form.register('rank', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label>Created</Label>
            <Input value={formValue.createdAt} disabled />
          </div>
          <div className="space-y-2">
            <Label>Updated</Label>
            <Input value={formValue.updatedAt} disabled />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>EN Description</Label>
            <Input {...form.register('descriptionEn')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>ES Description</Label>
            <Input {...form.register('descriptionEs')} />
          </div>
          {formValue.deletedAt && (
            <div className="space-y-2">
              <Label>Deleted</Label>
              <Input value={formValue.deletedAt} disabled />
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
    </Form>
  );
};

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";


export default function Page() {
  const formFields = trpc.example.getFormFields.useQuery({
    categorySlug: "school-bus-driver",
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-6 px-4 md:gap-8 md:py-8 lg:px-8">
          {formFields.isLoading? <><LoaderCircle className="animate-spin" /></>: formFields.data?.map((formField) => (
            <Card key={formField.formFieldId} className="@container/card">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl font-semibold">
                  {formField.labelEn || "Untitled Form Field"}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {formField.descriptionEn}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <KeyValue label="Slug" value={formField.formFieldSlug} />
                  <KeyValue label="ES Label" value={formField.labelEs} />
                  <KeyValue label="Type" value={formField.componentType} />
                  <KeyValue label="Form Step" value={formField.formStepId} />
                  <KeyValue label="Column" value={formField.columnName} />
                  <KeyValue label="Table" value={formField.tableName} />
                  <KeyValue label="Active" value={formField.isActive ? "Yes" : "No"} />
                  <KeyValue label="Created" value={formField.createdAt} />
                  <KeyValue label="Updated" value={formField.updatedAt} />
                  {formField.deletedAt && (
                    <KeyValue label="Deleted" value={formField.deletedAt} />
                  )}
                </div>

                {formField.formValues.length > 0 && (
                  <Accordion type="multiple" className="border rounded-md">
                    {formField.formValues.map((formValue) => (
                      <AccordionItem
                        key={formValue.formValueId}
                        value={formValue.formValueId.toString()}
                      >
                        <AccordionTrigger className="flex w-full items-center justify-between py-3 px-4 text-sm font-medium transition-all hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                          <span className="truncate">
                           {formValue.valueEn}{" "} ({formValue.formValueSlug})
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 shrink-0 transition-transform duration-200"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </AccordionTrigger>
                        <AccordionContent className="w-full py-3 px-4 text-sm font-medium transition-all hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                          <FormComponent formValue={formValue} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
                       
