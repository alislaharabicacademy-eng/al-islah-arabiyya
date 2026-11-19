/* Shared required residential-address validation for both student intake forms.
 * Preserve the existing Firestore "address" string field so older student
 * records and deployed security rules remain compatible.
 */
(function (root) {
  'use strict';
  const fields = [
    ['doorNumber', 'Door Number'],
    ['addressLine1', 'Address Line 1'],
    ['addressLine2', 'Address Line 2'],
    ['landmark', 'Landmark'],
    ['pinCode', 'PIN Code']
  ];
  const pinPattern = /^[1-9][0-9]{5}$/;

  function read(form) {
    return Object.fromEntries(fields.map(([key]) => [
      key, String(form.elements[key]?.value ?? '').trim()
    ]));
  }

  function format(values) {
    for (const [key, label] of fields) {
      if (!String(values[key] ?? '').trim()) throw Error(label + ' is required.');
    }
    if (!pinPattern.test(String(values.pinCode).trim())) {
      throw Error('Enter a valid 6-digit Indian PIN code.');
    }
    const address = fields.map(([key, label]) =>
      label + ': ' + String(values[key]).trim()
    ).join('\n');
    // Public admission Firestore rule currently caps address to 500 characters.
    if (address.length > 500) throw Error('Address is too long. Shorten the address lines.');
    return address;
  }

  function attach(form) {
    for (const [key] of fields) {
      form.elements[key]?.addEventListener('input', event =>
        event.currentTarget.setCustomValidity('')
      );
    }
  }

  function validate(form) {
    const values = read(form);
    let firstInvalid = null;
    for (const [key, label] of fields) {
      const input = form.elements[key];
      if (!input) return false; // Never submit a partly loaded or altered form.
      const message = !values[key] ? label + ' is required.'
        : key === 'pinCode' && !pinPattern.test(values[key])
        ? 'Enter a valid 6-digit Indian PIN code.' : '';
      input.setCustomValidity(message);
      if (message && !firstInvalid) firstInvalid = input;
    }
    if (!firstInvalid) {
      try { format(values); }
      catch (error) {
        firstInvalid = form.elements.addressLine2;
        firstInvalid.setCustomValidity(error.message);
      }
    }
    if (firstInvalid) {
      firstInvalid.reportValidity();
      return false;
    }
    return true;
  }

  root.AcademyStudentAddress = Object.freeze({read, format, validate, attach});
})(globalThis);
