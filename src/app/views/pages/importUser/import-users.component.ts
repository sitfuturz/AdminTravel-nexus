import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';

@Component({
  selector: 'app-import-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-users.component.html',
  styleUrls: ['./import-users.component.css'],
})
export class ImportUsersComponent {
  selectedFile: File | null = null;
  uploading: boolean = false;
  uploadResponse: { success: boolean; message: string; data?: any } | null = null;

  constructor(private authService: AuthService) {}

  // Handle file selection
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadResponse = null; // Reset response on new file selection
    } else {
      this.selectedFile = null;
    }
  }

  // Upload file to the API
  async uploadFile(): Promise<void> {
    if (!this.selectedFile) {
      swalHelper.showToast('Please select a file to upload', 'warning');
      return;
    }

    this.uploading = true;
    this.uploadResponse = null;

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const response = await this.authService.uploadExcelFile(formData);
      this.uploadResponse = response;
      swalHelper.showToast(response.message, 'success');
    } catch (error: any) {
      console.error('Upload Error:', error);
      this.uploadResponse = {
        success: false,
        message: error?.message || 'Failed to upload file',
      };
      swalHelper.showToast(this.uploadResponse.message, 'error');
    } finally {
      this.uploading = false;
    }
  }
}