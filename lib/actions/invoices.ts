'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  Invoice,
  InvoiceWithRelations,
  InvoiceLineItem,
  InvoicePayment,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceLineItemData,
  CreateInvoicePaymentData,
  InvoiceFilters,
  InvoiceSummaryStats,
} from '@/lib/types/invoices';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET INVOICES
// =============================================

export async function getInvoices(
  companyId: string,
  filters?: InvoiceFilters
): Promise<ActionResponse<{ invoices: InvoiceWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('invoices')
      .select(
        `
        *,
        site:clinical_sites(site_number),
        protocol:clinical_protocols(protocol_number, title),
        contract:site_contracts(contract_number)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (filters?.site_id) query = query.eq('site_id', filters.site_id);
    if (filters?.protocol_id) query = query.eq('protocol_id', filters.protocol_id);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { invoices: (data || []) as InvoiceWithRelations[], total: count || 0 },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoices' };
  }
}

// =============================================
// GET SINGLE INVOICE WITH LINE ITEMS
// =============================================

export async function getInvoice(
  invoiceId: string
): Promise<ActionResponse<InvoiceWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        site:clinical_sites(site_number),
        protocol:clinical_protocols(protocol_number, title),
        contract:site_contracts(contract_number)
      `
      )
      .eq('id', invoiceId)
      .single();

    if (error) return { success: false, error: error.message };

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at');

    const { data: payments } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    const invoice = data as InvoiceWithRelations;
    invoice.line_items = (lineItems || []) as InvoiceLineItem[];
    invoice.payments = (payments || []) as InvoicePayment[];

    return { success: true, data: invoice };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoice' };
  }
}

// =============================================
// CREATE INVOICE
// =============================================

export async function createInvoice(
  companyId: string,
  input: CreateInvoiceData
): Promise<ActionResponse<Invoice>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        site_id: input.site_id,
        protocol_id: input.protocol_id || null,
        contract_id: input.contract_id || null,
        invoice_date: input.invoice_date || new Date().toISOString().slice(0, 10),
        due_date: input.due_date || null,
        currency_code: input.currency_code || 'USD',
        payment_terms: input.payment_terms || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as Invoice };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create invoice' };
  }
}

// =============================================
// UPDATE INVOICE
// =============================================

export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceData
): Promise<ActionResponse<Invoice>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoices')
      .update(input)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as Invoice };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update invoice' };
  }
}

// =============================================
// DELETE INVOICE
// =============================================

export async function deleteInvoice(invoiceId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete invoice' };
  }
}

// =============================================
// ADD LINE ITEM TO INVOICE
// =============================================

export async function addInvoiceLineItem(
  input: CreateInvoiceLineItemData
): Promise<ActionResponse<InvoiceLineItem>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoice_line_items')
      .insert({
        invoice_id: input.invoice_id,
        payment_record_id: input.payment_record_id || null,
        payment_activity_id: input.payment_activity_id || null,
        description: input.description,
        quantity: input.quantity || 1,
        unit_amount: input.unit_amount,
        total_amount: input.total_amount,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Recalculate invoice total
    const { data: items } = await supabase
      .from('invoice_line_items')
      .select('total_amount')
      .eq('invoice_id', input.invoice_id);

    const total = (items || []).reduce((sum, item) => sum + Number(item.total_amount), 0);
    await supabase.from('invoices').update({ total_amount: total }).eq('id', input.invoice_id);

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as InvoiceLineItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add line item' };
  }
}

// =============================================
// DELETE LINE ITEM
// =============================================

export async function deleteInvoiceLineItem(
  lineItemId: string,
  invoiceId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('invoice_line_items').delete().eq('id', lineItemId);
    if (error) return { success: false, error: error.message };

    const { data: items } = await supabase
      .from('invoice_line_items')
      .select('total_amount')
      .eq('invoice_id', invoiceId);

    const total = (items || []).reduce((sum, item) => sum + Number(item.total_amount), 0);
    await supabase.from('invoices').update({ total_amount: total }).eq('id', invoiceId);

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete line item' };
  }
}

// =============================================
// RECORD PAYMENT AGAINST INVOICE
// =============================================

export async function recordInvoicePayment(
  input: CreateInvoicePaymentData
): Promise<ActionResponse<InvoicePayment>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id: input.invoice_id,
        payment_date: input.payment_date || new Date().toISOString().slice(0, 10),
        payment_amount: input.payment_amount,
        payment_method: input.payment_method || null,
        reference_number: input.reference_number || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Recalculate paid amount and update status
    const { data: payments } = await supabase
      .from('invoice_payments')
      .select('payment_amount')
      .eq('invoice_id', input.invoice_id);

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.payment_amount), 0);

    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', input.invoice_id)
      .single();

    let newStatus: string = 'sent';
    if (invoice && totalPaid >= Number(invoice.total_amount)) {
      newStatus = 'paid_in_full';
    } else if (totalPaid > 0) {
      newStatus = 'paid_in_part';
    }

    await supabase
      .from('invoices')
      .update({ paid_amount: totalPaid, status: newStatus })
      .eq('id', input.invoice_id);

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as InvoicePayment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record payment' };
  }
}

// =============================================
// CREATE INVOICE FROM PAYMENT RECORDS
// =============================================

export async function createInvoiceFromPaymentRecords(
  companyId: string,
  siteId: string,
  paymentRecordIds: string[],
  invoiceData: CreateInvoiceData
): Promise<ActionResponse<Invoice>> {
  try {
    const supabase = await createClient();

    // Create the invoice
    const result = await createInvoice(companyId, { ...invoiceData, site_id: siteId });
    if (!result.success || !result.data) return result;

    const invoice = result.data;

    // Fetch payment records and create line items
    const { data: records } = await supabase
      .from('payment_records')
      .select('id, payment_number, earned_amount, payment_type')
      .in('id', paymentRecordIds);

    if (records) {
      for (const record of records) {
        await addInvoiceLineItem({
          invoice_id: invoice.id,
          payment_record_id: record.id,
          description: `Payment ${record.payment_number || record.id.slice(0, 8)} (${record.payment_type})`,
          quantity: 1,
          unit_amount: Number(record.earned_amount),
          total_amount: Number(record.earned_amount),
        });
      }
    }

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: invoice };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create invoice from records' };
  }
}

// =============================================
// GET INVOICE SUMMARY STATS
// =============================================

export async function getInvoiceSummaryStats(
  companyId: string
): Promise<ActionResponse<InvoiceSummaryStats>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoices')
      .select('id, status, total_amount, paid_amount')
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };

    const invoices = data || [];
    const stats: InvoiceSummaryStats = {
      total_invoices: invoices.length,
      draft_count: invoices.filter((i) => i.status === 'draft').length,
      sent_count: invoices.filter((i) => i.status === 'sent').length,
      overdue_count: invoices.filter((i) => i.status === 'overdue').length,
      total_invoiced: invoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
      total_paid: invoices.reduce((sum, i) => sum + Number(i.paid_amount), 0),
      total_outstanding: invoices
        .filter((i) => !['paid_in_full', 'cancelled'].includes(i.status))
        .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.paid_amount)), 0),
    };

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch stats' };
  }
}
