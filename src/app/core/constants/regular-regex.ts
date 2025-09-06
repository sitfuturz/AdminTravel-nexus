export const RegularRegex = {
  number: /^[0-9]*$/,
  mobile: /^[+0-9]*$/,
  phoneNo: /^[6-9]\d{9}$/,
  alphabet: /^[a-zA-b\s.]*$/,
  userName: /^[a-zA-Z][a-zA-Z0-9!@#\$%\^\&*\)\/\(+=._-\s.,$;]+$/,
  tenDigit: /^\d{10}$/,
  latLong: /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/,
  url: /^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+\.[a-z]+(\/[a-zA-Z0-9#]+\/?)*$/,
  date: /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|1\d|2\d|3[01])$/,
  email: /^([a-zA-Z0-9_\-\.\+]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/,
  usPhone: /^((\([0-9]{3}\))|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/,
  upperCase: /[A-Z]/,
  lowerCase: /[a-z]/,
  specialCharacter: /[\W_]/,
  gstNumber: /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/,
  panNumber: /[A-Z]{5}[0-9]{4}[A-Z]{1}/
  
};
