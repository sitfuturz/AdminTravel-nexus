import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { FinanceService, Expense, ExpenseResponse,  } from '../../../services/auth.service';
import { ChapterService } from '../../../services/auth.service';
import { common } from '../../../core/constants/common';

import { AppStorage } from '../../../core/utilities/app-storage';

import { swalHelper } from '../../../core/constants/swal-helper';
import { jwtDecode } from 'jwt-decode';
declare var bootstrap: any;

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [FinanceService, ChapterService],
  templateUrl: './expense.component.html',
  styleUrls: ['./expense.component.css'],
})
export class ExpenseComponent implements OnInit, AfterViewInit {
  expenses: Expense[] = [];
  totalCollections: number = 0;
  totalExpenses: number = 0;
  balance: number = 0;
  totalPages: number = 1;
  loading: boolean = false;
  formSubmitted: boolean = false;
  expenseModal: any;
  previewModal: any;
  chapters: string[] = [];
  selectedChapter: string = '';
  adminId: string = '';
  editMode: boolean = false;
  selectedExpense: Expense | null = null;
  selectedFile: File | null = null;
  filePreview: string | null = null;
  newExpense = {
    category: '',
    amount: 0,
    description: '',
    receipt: null as File | null,
  };
  payload = {
    page: 1,
    limit: 10,
  };
  expenseCategories: string[] = ['Venue', 'Food', 'Travel', 'Marketing', 'Other'];

  constructor(
    private financeService: FinanceService,
    private chapterService: ChapterService,
    private storage: AppStorage,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadChapters();
    this.fetchFinanceData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('expenseModal');
      if (modalElement) {
        this.expenseModal = new bootstrap.Modal(modalElement);
      }
      const previewModalElement = document.getElementById('previewModal');
      if (previewModalElement) {
        this.previewModal = new bootstrap.Modal(previewModalElement);
      }
      this.cdr.detectChanges();
    }, 300);
  }

  async loadUserData(): Promise<void> {
    const token = this.storage.get(common.TOKEN);
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.adminId = decoded.adminId|| decoded.userId || '';
        this.selectedChapter = this.storage.get('chapter') || '';
      } catch (error) {
        console.error('Error decoding token:', error);
        swalHelper.showToast('Invalid session. Please log in again.', 'error');
      }
    }
  }

  async loadChapters(): Promise<void> {
    try {
      const response = await this.chapterService.getAllChaptersForDropdown();
      this.chapters = response.map((chapter: any) => chapter.name);
      if (!this.selectedChapter && this.chapters.length > 0) {
        this.selectedChapter = this.chapters[0];
        this.storage.set('chapter', this.selectedChapter);
        this.fetchFinanceData();
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading chapters:', error);
      swalHelper.showToast('Failed to load chapters', 'error');
    }
  }

  async fetchFinanceData(): Promise<void> {
    if (!this.selectedChapter) {
      this.expenses = [];
      this.totalCollections = 0;
      this.totalExpenses = 0;
      this.balance = 0;
      this.totalPages = 1;
      return;
    }

    this.loading = true;
    try {
      const response = await this.financeService.getChapterFinanceSummary({
        chapter: this.selectedChapter,
        page: this.payload.page,
        limit: this.payload.limit,
      });
      if (response.success && response.data) {
        this.totalCollections = response.data.totalCollections || 0;
        this.totalExpenses = response.data.totalExpenses || 0;
        this.balance = response.data.balance || 0;
        this.expenses = response.data.expenses || [];
        this.totalPages = response.data.pagination?.totalPages || 1;
      } else {
        this.expenses = [];
        this.totalCollections = 0;
        this.totalExpenses = 0;
        this.balance = 0;
        this.totalPages = 1;
        swalHelper.showToast(response.message || 'No finance data found', 'warning');
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching finance summary:', error);
      this.expenses = [];
      this.totalCollections = 0;
      this.totalExpenses = 0;
      this.balance = 0;
      this.totalPages = 1;
      swalHelper.showToast('Failed to fetch finance data', 'error');
    } finally {
      this.loading = false;
    }
  }

  async addExpense(form: any): Promise<void> {
    this.formSubmitted = true;
    if (!this.validateForm()) return;

    try {
      this.loading = true;
      const formData = new FormData();
      formData.append('userId', this.adminId);
      formData.append('chapter', this.selectedChapter);
      formData.append('category', this.newExpense.category);
      formData.append('amount', this.newExpense.amount.toString());
      formData.append('description', this.newExpense.description?.trim() || '');
      if (this.newExpense.receipt) {
        formData.append('receipt', this.newExpense.receipt);
      }

      const response = await this.financeService.addExpense(formData);
      if (response.success) {
        swalHelper.showToast(response.message, 'success');
        this.closeModal();
        this.resetForm();
        this.fetchFinanceData();
      } else {
        swalHelper.showToast(response.message || 'Failed to add expense', 'error');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      swalHelper.showToast('Failed to add expense', 'error');
    } finally {
      this.loading = false;
    }
  }

  async updateExpense(form: any): Promise<void> {
    this.formSubmitted = true;
    if (!this.validateForm()) return;

    try {
      this.loading = true;
      const formData = new FormData();
      formData.append('userId', this.adminId);
      formData.append('chapter', this.selectedChapter);
      formData.append('expenseId', this.selectedExpense?._id || '');
      formData.append('category', this.newExpense.category);
      formData.append('amount', this.newExpense.amount.toString());
      formData.append('description', this.newExpense.description?.trim() || '');
      if (this.newExpense.receipt) {
        formData.append('receipt', this.newExpense.receipt);
      }

      const response = await this.financeService.updateExpense(formData);
      if (response.success) {
        swalHelper.showToast(response.message, 'success');
        this.closeModal();
        this.resetForm();
        this.fetchFinanceData();
      } else {
        swalHelper.showToast(response.message || 'Failed to update expense', 'error');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      swalHelper.showToast('Failed to update expense', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Expense',
        'Are you sure you want to delete this expense? This action cannot be undone.',
        'warning'
      );
      if (result.isConfirmed) {
        this.loading = true;
        const response = await this.financeService.deleteExpense({
          userId: this.adminId,
          chapter: this.selectedChapter,
          expenseId,
        });
        if (response.success) {
          swalHelper.showToast(response.message, 'success');
          this.fetchFinanceData();
        } else {
          swalHelper.showToast(response.message || 'Failed to delete expense', 'error');
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      swalHelper.showToast('Failed to delete expense', 'error');
    } finally {
      this.loading = false;
    }
  }

  async openEditExpenseModal(expenseId: string): Promise<void> {
    try {
      this.loading = true;
      const response = await this.financeService.getExpenseById({
        chapter: this.selectedChapter,
        expenseId,
      });
      if (response.success && response.data.expense) {
        this.selectedExpense = response.data.expense;
        this.editMode = true;
        this.newExpense = {
          category: this.selectedExpense?.category||'',
          amount: this.selectedExpense?.amount || 0,
          description: this.selectedExpense?.description || '',
          receipt: null,
        };
        this.filePreview = this.selectedExpense?.receipt
          ? this.getFileUrl(this.selectedExpense.receipt)
          : null;
        this.showModal();
      } else {
        swalHelper.showToast(response.message || 'Failed to fetch expense details', 'error');
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      swalHelper.showToast('Failed to fetch expense details', 'error');
    } finally {
      this.loading = false;
    }
  }

  openAddExpenseModal(): void {
    this.editMode = false;
    this.selectedExpense = null;
    this.resetForm();
    this.showModal();
  }

  openFilePreview(expense: Expense): void {
    this.selectedExpense = expense;
    this.filePreview = expense.receipt ? this.getFileUrl(expense.receipt) : null;
    this.showPreviewModal();
  }

  validateForm(): boolean {
    if (!this.newExpense.category?.trim()) {
      swalHelper.showToast('Please select a category', 'warning');
      return false;
    }
    if (!this.newExpense.amount || this.newExpense.amount <= 0) {
      swalHelper.showToast('Please enter a valid amount', 'warning');
      return false;
    }
    if (!this.newExpense.description?.trim()) {
      swalHelper.showToast('Please enter a description', 'warning');
      return false;
    }
    return true;
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        swalHelper.showToast('Please select a valid file (JPG, PNG, PDF)', 'error');
        return;
      }
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        swalHelper.showToast('File size should not exceed 5MB', 'error');
        return;
      }
      this.selectedFile = file;
      this.newExpense.receipt = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.filePreview = file.type.includes('image') ? e.target.result : null;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  resetForm(): void {
    this.newExpense = {
      category: '',
      amount: 0,
      description: '',
      receipt: null,
    };
    this.selectedFile = null;
    this.filePreview = null;
    this.formSubmitted = false;
  }

  showModal(): void {
    this.cdr.detectChanges();
    if (this.expenseModal) {
      this.expenseModal.show();
    } else {
      const modalElement = document.getElementById('expenseModal');
      if (modalElement) {
        this.expenseModal = new bootstrap.Modal(modalElement);
        this.expenseModal.show();
      }
    }
  }

  showPreviewModal(): void {
    this.cdr.detectChanges();
    if (this.previewModal) {
      this.previewModal.show();
    } else {
      const modalElement = document.getElementById('previewModal');
      if (modalElement) {
        this.previewModal = new bootstrap.Modal(modalElement);
        this.previewModal.show();
      }
    }
  }

  closeModal(): void {
    if (this.expenseModal) {
      this.expenseModal.hide();
    }
  }

  closePreviewModal(): void {
    if (this.previewModal) {
      this.previewModal.hide();
    }
  }

  onChapterChange(): void {
    this.payload.page = 1;
    this.storage.set('chapter', this.selectedChapter);
    this.fetchFinanceData();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchFinanceData();
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }

  getFileUrl(filePath: string): string {
    if (!filePath) return '';
    return filePath.startsWith('http') ? filePath : `https://gbs-connect.com/${filePath}`;
  }
}