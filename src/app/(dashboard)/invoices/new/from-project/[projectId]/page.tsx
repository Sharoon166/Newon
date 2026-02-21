import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject, getProjectInvoices } from '@/features/projects/actions';
import { getCustomers } from '@/features/customers/actions';
import { getProducts } from '@/features/inventory/actions';
import { getVirtualProducts } from '@/features/virtual-products/actions';
import { getAllPurchases } from '@/features/purchases/actions';
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';
import { InvoiceFormWithWarning } from './invoice-form-with-warning';
import { PageHeader } from '@/components/general/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { userHasPermission } from '@/lib/rbac';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface NewInvoiceFromProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

async function NewInvoiceFromProjectContent({ params }: NewInvoiceFromProjectPageProps) {
  const session = await getServerSession(authOptions);
  const { projectId } = await params;

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!userHasPermission(session, 'create:invoices')) {
    redirect('/not-allowed');
  }

  try {
    // Fetch project data
    const project = await getProject(projectId, session.user.id, session.user.role);

    if (!project) {
      redirect('/projects');
    }

    if (!project.customerId || project.customerId === 'otc') {
      redirect(`/projects/${projectId}?error=no-customer`);
    }

    // Fetch required data
    const [customersResult, variants, purchases, virtualProducts, paymentDetails, invoiceTerms, projectInvoices] = await Promise.all([
      getCustomers({ limit: 1000 }),
      getProducts(),
      getAllPurchases(),
      getVirtualProducts(),
      getPaymentDetails(),
      getInvoiceTerms(),
      getProjectInvoices(project.projectId!)
    ]);

    const customers = customersResult.docs;

    // Find the customer
    const customer = customers.find(c => c.customerId === project.customerId || c.id === project.customerId);

    if (!customer) {
      redirect(`/projects/${projectId}?error=customer-not-found`);
    }

    // Check for existing non-cancelled invoices
    const activeInvoices = projectInvoices.filter(inv => inv.status !== 'cancelled');
    const existingInvoicesCount = activeInvoices.length;
    const existingInvoiceNumbers = activeInvoices.map(inv => inv.invoiceNumber);

    // Transform project inventory to invoice items (no markup - client decides pricing)
    const inventoryItems = project.inventory.map(item => ({
      id: item.id || `inv-${Math.random().toString(36).substring(2, 11)}`,
      productId: item.productId || item.virtualProductId || 'manual',
      description: item.productName,
      variantId: item.variantId,
      variantSKU: item.sku,
      virtualProductId: item.virtualProductId,
      isVirtualProduct: item.isVirtualProduct,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
      purchaseId: item.purchaseId,
      originalRate: item.rate,
      saleRate: item.rate,
      componentBreakdown: item.componentBreakdown,
      customExpenses: item.customExpenses,
      totalComponentCost: item.totalComponentCost,
      totalCustomExpenses: item.totalCustomExpenses
    }));

    // Transform project expenses to invoice items (no markup - client decides pricing)
    const expenseItems = project.expenses.map(expense => ({
      id: expense.id || `exp-${Math.random().toString(36).substring(2, 11)}`,
      productId: 'expense',
      description: `${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}: ${expense.description}`,
      variantId: undefined,
      variantSKU: `EXP-${expense.id}`,
      virtualProductId: undefined,
      isVirtualProduct: false,
      quantity: 1,
      rate: expense.amount,
      amount: expense.amount,
      purchaseId: undefined,
      originalRate: expense.amount,
      saleRate: expense.amount
    }));

    // Combine all items
    const allItems = [...inventoryItems, ...expenseItems];

    // Prepare initial data for the form
    const initialData = {
      date: new Date().toISOString().split('T')[0],
      billingType: 'retail' as const,
      market: 'newon' as const, // Default to newon, user can change in form
      customerId: customer.customerId || customer.id,
      client: {
        name: customer.name,
        company: customer.company || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.zip || ''
      },
      items: allItems,
      discountType: 'percentage' as const,
      discount: 0,
      taxRate: 0,
      notes: `Generated from Project: ${project.title} (${project.projectId})\n\nInventory Items: ${project.inventory.length}\nExpenses: ${project.expenses.length}\n\nNote: Prices shown are cost prices. Please adjust rates as needed for your profit margin.`,
      terms: invoiceTerms[0] || '',
      paid: 0,
      projectId: project.projectId // Important: Link back to project
    };

    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/projects/${projectId}`} className="hover:text-foreground">
            {project.title}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">New Invoice</span>
        </div>

        <PageHeader
          title="New Invoice from Project"
          description={`Review and adjust prices as needed`}
        />

        <InvoiceFormWithWarning
          customers={customers}
          variants={variants}
          purchases={purchases}
          virtualProducts={virtualProducts}
          paymentDetails={paymentDetails}
          invoiceTerms={invoiceTerms}
          initialData={initialData}
          projectId={project.projectId!}
          existingInvoicesCount={existingInvoicesCount}
          existingInvoiceNumbers={existingInvoiceNumbers}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading project for invoice:', error);
    redirect('/projects');
  }
}

export default function NewInvoiceFromProjectPage(props: NewInvoiceFromProjectPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <NewInvoiceFromProjectContent {...props} />
    </Suspense>
  );
}
