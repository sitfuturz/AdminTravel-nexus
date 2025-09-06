import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { FinanceService, Collection, CollectionHistoryResponse } from '../../../services/auth.service';
import { ChapterService } from '../../../services/auth.service';
import { common } from '../../../core/constants/common';

import { AppStorage } from '../../../core/utilities/app-storage';

import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
declare var bootstrap: any;

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [FinanceService, ChapterService],
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.css'],
})
export class FinanceComponent implements OnInit, AfterViewInit {
  collections: CollectionHistoryResponse = {
    message: '',
    data: {
      totalCollections: 0,
      collectionHistory: [],
      pagination: {
        page: 1,
        totalPages: 1,
        totalEntries: 0,
        hasNext: false,
        hasPrev: false,
      },
    },
    status: 200,
    success: true,
  };
  loading: boolean = false;
  Ascent: boolean = false;
  formSubmitted: boolean = false;
  collectionModal: any;
  chapters: string[] = [];
  selectedChapter: string = '';
  userId: string = '';
  newCollection = {
    amount: 0,
    description: '',
  };
  payload = {
    page: 1,
    limit: 10,
  };
  private searchSubject = new Subject<string>();

  constructor(
    private financeService: FinanceService,
    private chapterService: ChapterService,
    private storage: AppStorage,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchCollections();
    });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadChapters();
    this.fetchCollections();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('collectionModal');
      if (modalElement) {
        this.collectionModal = new bootstrap.Modal(modalElement);
      }
      this.cdr.detectChanges();
    }, 300);
  }

  async loadUserData(): Promise<void> {
    const token = this.storage.get(common.TOKEN);
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.userId = decoded.adminId || decoded.userId || '';
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
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading chapters:', error);
      swalHelper.showToast('Failed to load chapters', 'error');
    }
  }

  async fetchCollections(): Promise<void> {
    if (!this.selectedChapter) return;
    this.loading = true;
    try {
      const response = await this.financeService.getCollectionHistory({
        chapter: this.selectedChapter,
        page: this.payload.page,
        limit: this.payload.limit,
      });
      this.collections = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching collections:', error);
      this.collections.data.collectionHistory = [];
      this.collections.data.totalCollections = 0;
      this.collections.data.pagination = {
        page: 1,
        totalPages: 1,
        totalEntries: 0,
        hasNext: false,
        hasPrev: false,
      };
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
    }
  }

  async addCollection(form: any): Promise<void> {
    this.formSubmitted = true;
    if (!this.newCollection.amount || this.newCollection.amount <= 0) {
      swalHelper.showToast('Please enter a valid amount', 'warning');
      return;
    }
    if (!this.newCollection.description?.trim()) {
      swalHelper.showToast('Please enter a description', 'warning');
      return;
    }
    try {
      this.loading = true;
      const response = await this.financeService.addCollection({
        userId: this.userId,
        chapter: this.selectedChapter,
        amount: this.newCollection.amount,
        description: this.newCollection.description,
      });
      if (response.success) {
        swalHelper.showToast(response.message, 'success');
        this.closeModal();
        this.resetForm();
        this.fetchCollections();
      } else {
        swalHelper.showToast(response.message || 'Failed to add collection', 'error');
      }
    } catch (error) {
      console.error('Error adding collection:', error);
      swalHelper.showToast('Failed to add collection', 'error');
    } finally {
      this.loading = false;
    }
  }

  async removeLastCollection(): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Remove Last Collection',
        'Are you sure you want to remove the last collection? This action cannot be undone.',
        'warning'
      );
      if (result.isConfirmed) {
        this.loading = true;
        const response = await this.financeService.removeLastCollection({
          userId: this.userId,
          chapter: this.selectedChapter,
        });
        if (response.success) {
          swalHelper.showToast(response.message, 'success');
          this.fetchCollections();
        } else {
          swalHelper.showToast(response.message || 'Failed to remove last collection', 'error');
        }
      }
    } catch (error) {
      console.error('Error removing last collection:', error);
      swalHelper.showToast('Failed to remove last collection', 'error');
    } finally {
      this.loading = false;
    }
  }

  openAddCollectionModal(): void {
    this.formSubmitted = false;
    this.resetForm();
    this.showModal();
  }

  resetForm(): void {
    this.newCollection = {
      amount: 0,
      description: '',
    };
    this.formSubmitted = false;
  }

  showModal(): void {
    this.cdr.detectChanges();
    if (this.collectionModal) {
      this.collectionModal.show();
    } else {
      const modalElement = document.getElementById('collectionModal');
      if (modalElement) {
        this.collectionModal = new bootstrap.Modal(modalElement);
        this.collectionModal.show();
      }
    }
  }

  closeModal(): void {
    if (this.collectionModal) {
      this.collectionModal.hide();
    }
  }

  onChapterChange(): void {
    this.payload.page = 1;
    this.fetchCollections();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchCollections();
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
}