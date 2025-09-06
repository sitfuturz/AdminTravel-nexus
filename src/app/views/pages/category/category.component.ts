import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category, CategoryResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [CategoryService],
  templateUrl: 'category.component.html',
  styleUrls: ['./category.component.css'],
})
export class CategoriesComponent implements OnInit, AfterViewInit {
  categories: CategoryResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null
  };
  
  loading: boolean = false;
  searchQuery: string = '';
  selectedCategory: Category | null = null;
  categoryModal: any;
  editMode: boolean = false;
  
  newCategory = {
    name: '',
    status: false
  };
  
  private searchSubject = new Subject<string>();
  
  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  constructor(
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchCategories();
    });
  }

  ngOnInit(): void {
    this.fetchCategories();
  }

  ngAfterViewInit(): void {
    // Initialize modal properly with a delay to ensure DOM is fully loaded
    setTimeout(() => {
      const modalElement = document.getElementById('categoryModal');
      if (modalElement) {
        this.categoryModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchCategories(): Promise<void> {
    this.loading = true;
    
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      
      const response = await this.categoryService.getCategories(requestData);
      this.categories = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching categories:', error);
      swalHelper.showToast('Failed to fetch categories', 'error');
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }
  
  onChange(): void {
    this.payload.page = 1;
    this.fetchCategories();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchCategories();
  }

  openAddCategoryModal(): void {
    this.editMode = false;
    this.newCategory = {
      name: '',
      status: false
    };
    
    this.showModal();
  }

  openEditCategoryModal(category: Category): void {
    this.editMode = true;
    this.selectedCategory = category;
    this.newCategory = {
      name: category.name,
      status: category.status
    };
    
    this.showModal();
  }
  
  showModal(): void {
    // Force detect changes
    this.cdr.detectChanges();
    
    if (this.categoryModal) {
      this.categoryModal.show();
    } else {
      try {
        const modalElement = document.getElementById('categoryModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.categoryModal = modalInstance;
          modalInstance.show();
        } else {
          // Fallback to jQuery
          $('#categoryModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        // Last resort fallback
        $('#categoryModal').modal('show');
      }
    }
  }
  
  closeModal(): void {
    if (this.categoryModal) {
      this.categoryModal.hide();
    } else {
      $('#categoryModal').modal('hide');
    }
  }

  async saveCategory(): Promise<void> {
    try {
      if (!this.newCategory.name) {
        swalHelper.showToast('Please fill all required fields', 'warning');
        return;
      }
  
      this.loading = true;
  
      const response = this.editMode && this.selectedCategory
        ? await this.categoryService.updateCategory(this.selectedCategory._id, this.newCategory)
        : await this.categoryService.createCategory(this.newCategory);
  
      console.log('Response:', response); // Debug log
  
      if (response && response.success) {
        swalHelper.showToast(`Category ${this.editMode ? 'updated' : 'created'} successfully`, 'success');
        this.closeModal();
        this.fetchCategories();
      } else {
        if (response?.message === 'Category with this name already exists') {
          swalHelper.showToast('Category already exists', 'warning');
        } else {
          swalHelper.showToast(response?.message || `Failed to ${this.editMode ? 'update' : 'create'} category`, 'error');
        }
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      if (error?.response?.data?.message === 'Category with this name already exists' || error?.message === 'Category with this name already exists') {
        swalHelper.showToast('Category already exists', 'error');
      } else {
        swalHelper.showToast(error?.response?.data?.message || error?.message || 'Failed to save category', 'error');
      }
    } finally {
      this.loading = false;
    }
  }

  async toggleCategoryStatus(category: Category): Promise<void> {
    try {
      this.loading = true;
      
      const updatedStatus = !category.status;
      
      const response = await this.categoryService.updateCategory(
        category._id,
        { 
          name: category.name, 
          status: updatedStatus 
        }
      );
      
      if (response && response.success) {
        category.status = updatedStatus;
        swalHelper.showToast(`Category status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update category status', 'error');
      }
    } catch (error) {
      console.error('Error updating category status:', error);
      swalHelper.showToast('Failed to update category status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Category',
        'Are you sure you want to delete this category? This action cannot be undone.',
        'warning'
      );
      
      if (result.isConfirmed) {
        this.loading = true;
        
        try {
          const response = await this.categoryService.deleteCategory(categoryId);
          
          if (response && response.success) {
            swalHelper.showToast('Category deleted successfully', 'success');
            this.fetchCategories();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete category', 'error');
          }
        } catch (error) {
          console.error('Error deleting category:', error);
          swalHelper.showToast('Failed to delete category', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  // Format date helper function
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}