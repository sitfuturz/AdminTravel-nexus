import { ViewChild } from '@angular/core';

class CommonConstant {
  appStorage: any;
  constructor() {}
  
  public TOKEN: string = 'token';
  

  
 
  public USER_DATA: string = 'userInfo';
  public REMEMBER_ME: string = 'remember_me';
  public ADMIN_EMAIL: string = 'admin_email';
  public ADMIN_DATA: string = 'admin_data';
}
export let common = new CommonConstant();
