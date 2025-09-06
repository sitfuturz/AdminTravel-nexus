import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChapterService, ChapterCountsResponse, Chapter } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { NgSelectModule } from '@ng-select/ng-select';
import {jwtDecode} from 'jwt-decode';

@Component({
  selector: 'app-lt-points',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  providers: [ChapterService],
  templateUrl: './ltPoints.component.html',
  styleUrls: ['./ltPoints.component.css'],
})
export class LTPointsComponent implements OnInit, AfterViewInit {
  chapterCounts: ChapterCountsResponse = {
    message: '',
    status: 0,
    success: false,
    data: {
      chapterName: '',
      timePeriod: {
        start: '',
        end: '',
        filter: '',
      },
      counts: {
        referrals: 0,
        tyfcb: 0,
        tyfcbTotalAmount: 0,
        oneToOneMeetings: 0,
        testimonials: 0,
      },
    },
  };
  chapters: Chapter[] = [];
  selectedChapter: string = '';
  timeFilter: string = 'lastWeek';
  timeFilterOptions = ['lastWeek', 'lastMonth', 'allTime'];
  loading: boolean = false;
  userRole: string = '';
  userChapter: string = '';

  constructor(
    private chapterService: ChapterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.decodeUser();
    if (this.userRole === 'LT') {
      // For LT, use their chapter and fetch data directly
      this.selectedChapter = this.userChapter;
      this.fetchChapterCounts();
    } else {
      // For admin/other roles, show chapter filter
      this.fetchChapters();
    }
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  decodeUser(): void {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.userRole = decoded.role || '';
        this.userChapter = decoded.chapter || '';
      } catch (e) {
        this.userRole = '';
        this.userChapter = '';
      }
    } else {
      this.userRole = '';
      this.userChapter = '';
    }
  }

  async fetchChapters(): Promise<void> {
    try {
      this.loading = true;
      this.chapters = await this.chapterService.getAllChaptersForDropdown();
      if (this.chapters.length > 0) {
        this.selectedChapter = this.chapters[0].name;
        this.fetchChapterCounts();
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
      swalHelper.showToast('Failed to fetch chapters', 'error');
    } finally {
      this.loading = false;
    }
  }

  async fetchChapterCounts(): Promise<void> {
    if (!this.selectedChapter || !this.timeFilter) {
      swalHelper.showToast('Please select a chapter and time filter', 'warning');
      return;
    }

    try {
      this.loading = true;
      const requestData = {
        chapterName: this.selectedChapter,
        timeFilter: this.timeFilter,
      };
      this.chapterCounts = await this.chapterService.getChapterCounts(requestData);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching chapter counts:', error);
      swalHelper.showToast('Failed to fetch chapter counts', 'error');
    } finally {
      this.loading = false;
    }
  }

  onChapterChange(): void {
    this.fetchChapterCounts();
  }

  onTimeFilterChange(): void {
    if (!this.timeFilter) {
      this.timeFilter = 'lastWeek'; // Default to 'lastWeek' if cleared
    }
    this.fetchChapterCounts();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }
}