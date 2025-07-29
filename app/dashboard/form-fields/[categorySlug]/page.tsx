"use client";

import { LoaderCircle } from "lucide-react";


import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useState } from "react";
import { trpc } from "@/util/trpc";
import FormValuesData from "./_components/form-values-data";
import { useParams, useSearchParams } from "next/navigation";


interface KeyValueProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

const KeyValue = ({ label, value, className = "" }: KeyValueProps) => (
  <p className={className}>
    <strong>{label}:</strong> {value}
  </p>
);


export default function Page() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  // const params = useSearchParams();
  const params = useParams();

  const formFields = trpc.example.getFormFields.useQuery({
    categorySlug: params.categorySlug as string,
    type: typeFilter as "job" | "driver" || undefined,
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-6 px-4 md:gap-8 md:py-8 lg:px-8">
          <div className="flex justify-end">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border p-2"
            >
              <option value="">All Types</option>
              <option value="job">Job</option>
              <option value="driver">Driver</option>
            </select>
          </div>
          {formFields.isLoading ? (
            <>
              <LoaderCircle className="animate-spin" />
            </>
          ) : (
            formFields.data?.map((formField) => (
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
                    <KeyValue
                      label="Active"
                      value={formField.isActive ? "Yes" : "No"}
                    />
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
                              {formValue.valueEn} ({formValue.formValueSlug})
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
                            <FormValuesData formValue={formValue} />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
