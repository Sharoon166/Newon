import { ArrowRight, ScrollText, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/general/page-header";
import Link from "next/link";
import { InvoiceList } from "@/features/invoices/components/invoice-list";
import { QuotationList } from "@/features/invoices/components/quotation-list";
import { sampleInvoices, sampleQuotations } from "@/features/invoices/types";

export default function BillingAndQuotation() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Invoices & Quotations" 
        description="Generate and manage your invoices and quotations" 
      >
        <div className="flex items-center gap-2">
          <Button 
            asChild
            variant="outline"
            className="group"
          >
            <Link href="/invoices/new">
              Generate new <ArrowRight className="size-4 group-hover:translate-x-1 transition" />
            </Link>
          </Button>
        </div>
      </PageHeader>
      
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quotations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices" className="mt-6">
          <InvoiceList invoices={sampleInvoices} />
        </TabsContent>
        
        <TabsContent value="quotations" className="mt-6">
          <QuotationList quotations={sampleQuotations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}