import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubCategoryService, SubCategory, SubCategoryResponse, Category, CategoryService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-subcategories',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [SubCategoryService, CategoryService],
  templateUrl: './subcategory.component.html',
  styleUrls: ['./subcategory.component.css'],
})
export class SubCategoriesComponent implements OnInit, AfterViewInit {
  subCategories: SubCategoryResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };

  categories: Category[] = [];
  loading: boolean = false;
  categoriesLoading: boolean = false;
  searchQuery: string = '';
  selectedSubCategory: SubCategory | null = null;
  subCategoryModal: any;
  editMode: boolean = false;
  categoriesLoaded: boolean = false;

  newSubCategory = {
    name: '',
    category_name: '',
    status: false,
  };

  private searchSubject = new Subject<string>();

  payload = {
    search: '',
    page: 1,
    limit: 10,
  };

  constructor(
    private subCategoryService: SubCategoryService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchSubCategories();
    });
  }

  ngOnInit(): void {
    this.fetchCategories(); // Fetch categories first
    this.fetchSubCategories();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('subCategoryModal');
      if (modalElement) {
        this.subCategoryModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchSubCategories(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search,
      };
      const response = await this.subCategoryService.getSubCategories(requestData);
      this.subCategories = response;
      console.log('Fetched subcategories:', this.subCategories);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      swalHelper.showToast('Failed to fetch subcategories', 'error');
    } finally {
      this.loading = false;
    }
  }

  async fetchCategories(): Promise<void> {
    this.categoriesLoading = true;
    this.categoriesLoaded = false;
    try {
      const response = await this.categoryService.getCategories({
        page: 1,
        limit: 1000,
        search: '',
      });
      this.categories = response.docs;
      this.categoriesLoaded = true;
      console.log('Fetched categories:', this.categories);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching categories:', error);
      swalHelper.showToast('Failed to fetch categories', 'error');
    } finally {
      this.categoriesLoading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchSubCategories();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchSubCategories();
  }

  openAddSubCategoryModal(): void {
    if (!this.categoriesLoaded) {
      swalHelper.showToast('Please wait for categories to load', 'warning');
      return;
    }
    this.editMode = false;
    this.newSubCategory = {
      name: '',
      category_name: '',
      status: false,
    };
    this.showModal();
  }

  openEditSubCategoryModal(subCategory: SubCategory): void {
    if (!this.categoriesLoaded) {
      swalHelper.showToast('Please wait for categories to load', 'warning');
      return;
    }
    this.editMode = true;
    this.selectedSubCategory = subCategory;
    console.log('Full subcategory object:', JSON.stringify(subCategory, null, 2));
    
    this.newSubCategory = {
      name: subCategory.name,
      category_name: subCategory.category_name || '',
      status: subCategory.status,
    };
    console.log('newSubCategory after initialization:', this.newSubCategory);
    console.log('Categories available:', this.categories);
    this.cdr.detectChanges();
    setTimeout(() => this.showModal(), 100);
  }

  showModal(): void {
    this.cdr.detectChanges();
    if (this.subCategoryModal) {
      this.subCategoryModal.show();
    } else {
      try {
        const modalElement = document.getElementById('subCategoryModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.subCategoryModal = modalInstance;
          modalInstance.show();
        } else {
          $('#subCategoryModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#subCategoryModal').modal('show');
      }
    }
  }

  closeModal(): void {
    if (this.subCategoryModal) {
      this.subCategoryModal.hide();
    } else {
      $('#subCategoryModal').modal('hide');
    }
  }

  async saveSubCategory(): Promise<void> {
    try {
      this.loading = true;
      
      console.log('Payload for saveSubCategory:', this.newSubCategory);

      if (this.editMode && this.selectedSubCategory) {
        const response = await this.subCategoryService.updateSubCategory(this.selectedSubCategory._id, {
          name: this.newSubCategory.name,
          category_name: this.newSubCategory.category_name,
          status: this.newSubCategory.status,
        });
        if (response && response.success) {
          swalHelper.showToast('SubCategory updated successfully', 'success');
          this.closeModal();
          this.fetchSubCategories();
        } else {
          swalHelper.showToast(response.message || 'Failed to update subcategory', 'error');
        }
      } else {
        const response = await this.subCategoryService.createSubCategory({
          name: this.newSubCategory.name,
          category_name: this.newSubCategory.category_name,
          status: this.newSubCategory.status,
        });
        if (response && response.success) {
          swalHelper.showToast('SubCategory created successfully', 'success');
          this.closeModal();
          this.fetchSubCategories();
        } else {
          if (response?.message === 'SubCategory with this name already exists in the selected category') {
            swalHelper.showToast('SubCategory already exists', 'warning');
          } else {
            swalHelper.showToast(response.message || 'Failed to create subcategory', 'error');
          }
        }
      }
    } catch (error) {
      console.error('Error saving subcategory:', error);
      swalHelper.showToast('Failed to save subcategory', 'error');
    } finally {
      this.loading = false;
    }
  }

  async toggleSubCategoryStatus(subCategory: SubCategory): Promise<void> {
    try {
      this.loading = true;
      const updatedStatus = !subCategory.status;
      
      const response = await this.subCategoryService.updateSubCategory(subCategory._id, {
        name: subCategory.name,
        category_name: subCategory.category_name || '',
        status: updatedStatus,
      });
      if (response && response.success) {
        subCategory.status = updatedStatus;
        swalHelper.showToast(`SubCategory status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update subcategory status', 'error');
      }
    } catch (error) {
      console.error('Error updating subcategory status:', error);
      swalHelper.showToast('Failed to update subcategory status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteSubCategory(subCategoryId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete SubCategory',
        'Are you sure you want to delete this subcategory? This action cannot be undone.',
        'warning'
      );
      if (result.isConfirmed) {
        this.loading = true;
        try {
          const response = await this.subCategoryService.deleteSubCategory(subCategoryId);
          if (response && response.success) {
            swalHelper.showToast('SubCategory deleted successfully', 'success');
            this.fetchSubCategories();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete subcategory', 'error');
          }
        } catch (error) {
          console.error('Error deleting subcategory:', error);
          swalHelper.showToast('Failed to delete subcategory', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  getCategoryName(categoryName: string): string {
    if (!categoryName) return 'Unknown';
    return categoryName;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}