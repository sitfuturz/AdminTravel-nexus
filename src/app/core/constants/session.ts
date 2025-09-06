class Session {
  constructor() {}
  public TOKEN: string = 'userToken';
  public SERVING_CITY: string = 'servingCity';
  public COORDS: string = 'coords';
  public SESSION_ID: string = 'sessionId';
  public IS_USER_LOGGED_IN: string = 'isUserLoggedIn';

  public authCheckURLS: string[] = [];
}


export let session = new Session();
