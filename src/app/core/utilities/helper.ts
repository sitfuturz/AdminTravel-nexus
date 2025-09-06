import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';
import { swalHelper } from '../constants/swal-helper';

@Injectable({
  providedIn: 'root',
})
export class Helper {
  constructor() {}

  public showToast = async (title: any, icon: SweetAlertIcon) => {
    await Swal.fire({
      icon: icon,
      title: title,
      toast: true,
      showConfirmButton: false,
      showCloseButton: true,
      position: 'top-right',
      timer: 3500,
    });
  };

  public alert = async (text: any, icon: SweetAlertIcon) => {
    await Swal.fire({
      icon: icon,
      text: text,
      timer: 2500,
      showCloseButton: true,
      showConfirmButton: false,
    });
  };

  public confirmAlert = async (
    text: string,
    icon: SweetAlertIcon,
    confirmText: string,
    cancelText: string
  ) => {
    let result = await Swal.fire({
      icon: icon,
      text: text,
      showConfirmButton: true,
      showCancelButton: true,
      cancelButtonText: cancelText,
      confirmButtonText: confirmText,
    });
    return result.isConfirmed? true : false;
  };

  public loadScript(url: string) {
    const body = <HTMLDivElement>document.body;
    const script = document.createElement('script');
    script.innerHTML = '';
    script.src = url;
    script.async = false;
    script.defer = true;
    body.appendChild(script);
  }

  copy2clipboard = (data: string) => {
    navigator.clipboard
      .writeText(data)
      .then(() => {
        swalHelper.swalToast(
          'success',
          'Text copied successfully',
          'top-right'
        );
      })
      .catch((err) => {
        swalHelper.swalToast('error', 'Failed to copy text', 'top-right');
      });
  };
}
