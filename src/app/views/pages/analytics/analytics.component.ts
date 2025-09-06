import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { AnalyticsService, AnalyticsResponse } from '../../../services/auth.service';
Chart.register(...registerables);

interface AnalyticsData {
  userMetrics: {
    newUsers: number;
  };
  membershipMetrics: {
    newApplications: number;
  };
  engagementMetrics: {
    newFeeds: number;
    totalLikes: number;
    totalComments: number;
    avgLikesPerFeed: number;
    avgCommentsPerFeed: number;
  };
  businessMetrics: {
    referralTypes: {
      inside: number;
      outside: number;
    };
    newReferrals: number;
    newOneToOneMeetings: number;
    newTestimonials: number;
    newTYFCBs: number;
    totalTYFCBAmount: number;
    avgTYFCBAmount: number;
  };
  askAndLeadMetrics: {
    newAsks: number;
    completedAsks: number;
    newLeads: number;
    completedLeads: number;
  };
  loginMetrics: {
    loginsByDevice: {
      android: number;
      ios: number;
      web: number;
      unknown: number;
    };
    totalLogins: number;
    uniqueUsers: number;
    returningUsers: number;
    newUsers: number;
  };
  visitorMetrics: {
    visitorStatus: {
      present: number;
      absent: number;
    };
    visitorPreferences: {
      interested: number;
      notInterested: number;
      maybe: number;
    };
    newVisitors: number;
  };
  date: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [AnalyticsService],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
})
export class AnalyticsComponent implements OnInit {
  @ViewChild('referralChart', { static: false }) referralChartRef!: ElementRef;
  @ViewChild('visitorStatusChart', { static: false }) visitorStatusChartRef!: ElementRef;
  @ViewChild('visitorPreferencesChart', { static: false }) visitorPreferencesChartRef!: ElementRef;
  @ViewChild('engagementChart', { static: false }) engagementChartRef!: ElementRef;
  @ViewChild('askLeadChart', { static: false }) askLeadChartRef!: ElementRef;
  @ViewChild('loginDeviceChart', { static: false }) loginDeviceChartRef!: ElementRef;
  @ViewChild('loginUserTypesChart', { static: false }) loginUserTypesChartRef!: ElementRef;
  @ViewChild('loginSummaryChart', { static: false }) loginSummaryChartRef!: ElementRef;

  analyticsData: AnalyticsData | null = null;
  loading: boolean = false;
  
  charts: { [key: string]: Chart } = {};
  
  filters = {
    startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 1))),
    endDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 1)))
  };
  
  private filterSubject = new Subject<void>();
  
  constructor(
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchAnalytics();
    });
  }

  ngOnInit(): void {
    this.fetchAnalytics();
  }

  ngOnDestroy(): void {
    // Destroy all charts to prevent memory leaks
    Object.values(this.charts).forEach(chart => chart.destroy());
  }

  async fetchAnalytics(): Promise<void> {
    this.loading = true;
    try {
      const requestBody = {
        startDate: this.filters.startDate,
        endDate: this.filters.endDate
      };
      
      const response = await this.analyticsService.getAnalyticsByDateRange(requestBody);
      if (response.success && response.data && response.data.length > 0) {
        this.analyticsData = response.data[0];
        this.cdr.detectChanges();
        
        // Create charts after view is updated
        setTimeout(() => {
          this.createCharts();
        }, 100);
      } else {
        this.analyticsData = null;
        swalHelper.showToast('No analytics data found for selected date range', 'info');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      swalHelper.showToast('Failed to fetch analytics', 'error');
      this.analyticsData = null;
    } finally {
      this.loading = false;
    }
  }

  onFilterChange(): void {
    this.filterSubject.next();
  }

  resetFilters(): void {
    this.filters = {
      startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 1))),
      endDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 1)))
    };
    this.fetchAnalytics();
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private createCharts(): void {
    if (!this.analyticsData) return;

    // Destroy existing charts
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};

    this.createReferralChart();
    this.createVisitorStatusChart();
    this.createVisitorPreferencesChart();
    this.createEngagementChart();
    this.createAskLeadChart();
    this.createLoginDeviceChart();
    this.createLoginUserTypesChart();
    this.createLoginSummaryChart();
  }

  private createReferralChart(): void {
    if (!this.referralChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.referralChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.businessMetrics.referralTypes;

    this.charts['referral'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Inside Referrals', 'Outside Referrals'],
        datasets: [{
          data: [data.inside, data.outside],
          backgroundColor: ['#4CAF50', '#2196F3'],
          borderColor: ['#45a049', '#1976D2'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  private createVisitorStatusChart(): void {
    if (!this.visitorStatusChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.visitorStatusChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.visitorMetrics.visitorStatus;

    this.charts['visitorStatus'] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [data.present, data.absent],
          backgroundColor: ['#FF9800', '#F44336'],
          borderColor: ['#F57C00', '#D32F2F'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  private createVisitorPreferencesChart(): void {
    if (!this.visitorPreferencesChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.visitorPreferencesChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.visitorMetrics.visitorPreferences;

    this.charts['visitorPreferences'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Interested', 'Maybe', 'Not Interested'],
        datasets: [{
          data: [data.interested, data.maybe, data.notInterested],
          backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
          borderColor: ['#45a049', '#FF8F00', '#D32F2F'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  private createEngagementChart(): void {
    if (!this.engagementChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.engagementChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.engagementMetrics;

    this.charts['engagement'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['New Feeds', 'Total Likes', 'Total Comments'],
        datasets: [{
          label: 'Count',
          data: [data.newFeeds, data.totalLikes, data.totalComments],
          backgroundColor: ['#9C27B0', '#E91E63', '#FF5722'],
          borderColor: ['#7B1FA2', '#C2185B', '#D84315'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  private createAskLeadChart(): void {
    if (!this.askLeadChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.askLeadChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.askAndLeadMetrics;

    this.charts['askLead'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['New Asks', 'Completed Asks', 'New Leads', 'Completed Leads'],
        datasets: [{
          label: 'Count',
          data: [data.newAsks, data.completedAsks, data.newLeads, data.completedLeads],
          backgroundColor: ['#3F51B5', '#2196F3', '#00BCD4', '#009688'],
          borderColor: ['#303F9F', '#1976D2', '#0097A7', '#00695C'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  private createLoginDeviceChart(): void {
    if (!this.loginDeviceChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.loginDeviceChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.loginMetrics.loginsByDevice;

    this.charts['loginDevice'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Android', 'iOS', 'Web', 'Unknown'],
        datasets: [{
          data: [data.android, data.ios, data.web, data.unknown],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9E9E9E'],
          borderColor: ['#45a049', '#1976D2', '#F57C00', '#757575'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  private createLoginUserTypesChart(): void {
    if (!this.loginUserTypesChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.loginUserTypesChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.loginMetrics;

    this.charts['loginUserTypes'] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['New Users', 'Returning Users'],
        datasets: [{
          data: [data.newUsers, data.returningUsers],
          backgroundColor: ['#FF5722', '#673AB7'],
          borderColor: ['#D84315', '#512DA8'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  private createLoginSummaryChart(): void {
    if (!this.loginSummaryChartRef?.nativeElement || !this.analyticsData) return;

    const ctx = this.loginSummaryChartRef.nativeElement.getContext('2d');
    const data = this.analyticsData.loginMetrics;

    this.charts['loginSummary'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Logins', 'Unique Users', 'Returning Users'],
        datasets: [{
          label: 'Count',
          data: [data.totalLogins, data.uniqueUsers, data.returningUsers],
          backgroundColor: ['#3F51B5', '#009688', '#FF5722'],
          borderColor: ['#303F9F', '#00695C', '#D84315'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
}