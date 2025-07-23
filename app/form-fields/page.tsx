import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/util/prismaClient";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";

export default async function Page() {
  const formFields = await prisma.formField.findMany({
    include: {
      formValues: true,
    },
    take: 10,
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-6 px-4 md:gap-8 md:py-8 lg:px-8">
          {formFields.map((formField) => (
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
                  <p>
                    <strong>Slug:</strong> {formField.formFieldSlug}
                  </p>
                  <p>
                    <strong>ES Label:</strong> {formField.labelEs}
                  </p>
                  <p>
                    <strong>Type:</strong> {formField.componentType}
                  </p>
                  <p>
                    <strong>Form Step:</strong> {formField.formStepId}
                  </p>
                  <p>
                    <strong>Column:</strong> {formField.columnName}
                  </p>
                  <p>
                    <strong>Table:</strong> {formField.tableName}
                  </p>
                  <p>
                    <strong>Active:</strong> {formField.isActive ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Created:</strong>{" "}
                    {formField.createdAt.toISOString()}
                  </p>
                  <p>
                    <strong>Updated:</strong>{" "}
                    {formField.updatedAt.toISOString()}
                  </p>
                  {formField.deletedAt && (
                    <p>
                      <strong>Deleted:</strong>{" "}
                      {formField.deletedAt.toISOString()}
                    </p>
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
                          <span className="truncate">{formValue.formValueSlug}</span>
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
                        <AccordionContent className="w-full  py-3 px-4 text-sm font-medium transition-all hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180 space-y-2 text-sm text-muted-foreground">
                          <p>
                            <strong>EN:</strong> {formValue.valueEn}
                          </p>
                          <p>
                            <strong>ES:</strong> {formValue.valueEs}
                          </p>
                          <p>
                            <strong>EN Desc:</strong> {formValue.descriptionEn}
                          </p>
                          <p>
                            <strong>ES Desc:</strong> {formValue.descriptionEs}
                          </p>
                          <p>
                            <strong>Active:</strong>{" "}
                            {formValue.isActive ? "Yes" : "No"}
                          </p>
                          <p>
                            <strong>Group EN:</strong> {formValue.groupEn}
                          </p>
                          <p>
                            <strong>Group ES:</strong> {formValue.groupEs}
                          </p>
                          <p>
                            <strong>Category:</strong>{" "}
                            {formValue.inCategorySlug}
                          </p>
                          <p>
                            <strong>Type:</strong> {formValue.type}
                          </p>
                          <p>
                            <strong>Rank:</strong> {formValue.rank}
                          </p>
                          <p>
                            <strong>Created:</strong>{" "}
                            {formValue.createdAt.toISOString()}
                          </p>
                          <p>
                            <strong>Updated:</strong>{" "}
                            {formValue.updatedAt.toISOString()}
                          </p>
                          {formValue.deletedAt && (
                            <p>
                              <strong>Deleted:</strong>{" "}
                              {formValue.deletedAt.toISOString()}
                            </p>
                          )}
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
