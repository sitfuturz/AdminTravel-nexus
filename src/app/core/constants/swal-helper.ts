import Swal, { SweetAlertIcon, SweetAlertOptions, SweetAlertPosition } from 'sweetalert2';

class SwalHelper {
  public messageToast = async (message: string, icon: SweetAlertIcon) => {
    await Swal.fire({
      position: 'top-end',
      icon: icon,
      title: message,
      toast: true,
      showConfirmButton: false,
      timer: 2500,
    });
  };

  public showToast = async (message: string, icon: SweetAlertIcon) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    await Toast.fire({
      icon: icon,
      title: message    
    });

  };

  public showSwalLoading = async (title: String, html: string) => {
   
  };

  public hideSwalLoading = () => Swal.close();

  public success = async (message: string) => {
    await Swal.fire({
      icon: 'success',
      text: message,
      showConfirmButton: false,
      showCancelButton: false,
      timer: 1300,
    });
  };

  public warning = async (message: string) => {
    await Swal.fire({
      icon: 'warning',
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
    });
  };

  public error = async (error: any) => {
    await Swal.fire({
      icon: 'error',
      text: error.message,
      showConfirmButton: true,
      showCancelButton: false,
    });
  };

  public confirmation = async (
    title: string,
    message: string,
    icon: SweetAlertIcon,
    buttons: any[] = ['Okay! Proceed', 'cancel']
  ) => {
    return Swal.fire({
      icon: icon,
      title: title,
      text: message,
      showConfirmButton: true,
      showCancelButton: true,
      allowOutsideClick: false,
      confirmButtonText: buttons[0],
      cancelButtonText: buttons[1],
    });
  };

  public takeConfirmation = (
    title: string,
    text: string,
    confirmButtonText?: string
  ) => {
    return Swal.fire({
      icon: 'question',
      title: title,
      text: text,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: confirmButtonText ?? 'Okay!',
    });
  };

  public swalToast = (
    icon: SweetAlertIcon,
    titleText: string,
    position: SweetAlertPosition
  ) => {
    Swal.fire({
      icon: icon,
      toast: true,
      showCloseButton: true,
      position: position,
      showConfirmButton: false,
      timerProgressBar: false,
      title: titleText,
      timer: 2500,
    });
  };


  public onConfirmOrder = async (data: any) => {
    let question = `<div style="font-size:20px; font-weight: 600;">${data.sectionCount} New Requests</div>
    <div style="font-size:15px; font-weight: 400;">${data.message}.`;
    let confirmation = await Swal.fire({
      icon: 'info',
      html: question,
      allowEnterKey: false,
      allowEscapeKey: true,
      allowOutsideClick: true,
      showCloseButton: true,
      confirmButtonText: '<i class="ri-file-list-line"></i> View',
      confirmButtonColor: 'green',
      showConfirmButton: true,
    });
    if (confirmation.isConfirmed) {
      return 'confirmed';
    }
    return '';
  };

  public onReturnOrderConfirm = async (data: any, riderInfo: any) => {
    let loose = 0,
      boxes = 0;
    let shopNames: any[] = [];
    if (Array.isArray(data.orderDetails)) {
      data.orderDetails.forEach((v: any) => {
        v.user.forEach((a: any) => {
          loose += a?.package?.loose ?? 0;
          boxes += a?.package?.boxes ?? 0;
        });
        shopNames.push(...v.pickAddress.map((b: any) => b.name));
      });
    }

    let orderInfo = data.orderDetails.map((v: any) => {
      return {
        orderId: v?._id,
        userDetails: riderInfo,
        images: data?.tracking?.images ?? [],
        audioNote: data?.tracking?.audioNote ?? [],
      };
    });
    let text = `
      <b>${riderInfo.name}</b> came to return
      <b>${loose}</b> Loose, <b>${boxes}</b> Boxes.<br>
      <span>${shopNames.join(', ')}</span>
    `;
    let confirmation = await Swal.fire({
      icon: 'info',
      title: 'Return Confirmation',
      html: text,
      allowEnterKey: false,
      allowEscapeKey: true,
      allowOutsideClick: true,
      showCloseButton: true,
      confirmButtonText: '<i class="ri-check-line"></i> Confirm',
      showCancelButton: true,
      confirmButtonColor: 'green',
      showConfirmButton: true,
    });
    return confirmation.isConfirmed ? orderInfo : [];
  };
}

export let swalHelper = new SwalHelper();
