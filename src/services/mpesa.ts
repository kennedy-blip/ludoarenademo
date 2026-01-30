// M-Pesa Daraja API Integration
// Note: In production, API calls should go through your backend server
// to protect your API keys and handle callbacks securely

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passKey: string;
  shortCode: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface B2CRequest {
  phoneNumber: string;
  amount: number;
  remarks: string;
  occasion: string;
}

export interface TransactionStatus {
  ResultCode: string;
  ResultDesc: string;
  status: 'pending' | 'completed' | 'failed';
}

// Format phone number to M-Pesa format (254XXXXXXXXX)
export const formatPhoneNumber = (phone: string): string => {
  let formatted = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  } else if (formatted.startsWith('+254')) {
    formatted = formatted.substring(1);
  } else if (!formatted.startsWith('254')) {
    formatted = '254' + formatted;
  }
  
  return formatted;
};

// Validate Kenyan phone number
export const validatePhoneNumber = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone);
  // Should be 12 digits starting with 254
  return /^254[17]\d{8}$/.test(formatted);
};

// In a real app, these would call your backend API
// which then communicates with Safaricom's Daraja API

class MpesaService {
  // In production, this would be your backend endpoint
  // private baseUrl = '/api/mpesa';

  // Initiate STK Push (Lipa Na M-Pesa Online)
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    // In production, this calls your backend
    // Your backend then calls Safaricom's API:
    // POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
    
    // For demo, we simulate the response
    console.log('Initiating STK Push:', request);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          MerchantRequestID: 'demo-' + Date.now(),
          CheckoutRequestID: 'ws_CO_' + Date.now(),
          ResponseCode: '0',
          ResponseDescription: 'Success. Request accepted for processing',
          CustomerMessage: 'Success. Request accepted for processing'
        });
      }, 1500);
    });
  }

  // Check STK Push status
  async checkSTKPushStatus(checkoutRequestId: string): Promise<TransactionStatus> {
    // In production, this queries your backend for the callback result
    // or calls Safaricom's query API
    
    console.log('Checking status for:', checkoutRequestId);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful payment
        resolve({
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.',
          status: 'completed'
        });
      }, 3000);
    });
  }

  // Initiate B2C (Business to Customer) for payouts
  async initiateB2C(request: B2CRequest): Promise<{ success: boolean; message: string }> {
    // In production, this calls your backend
    // Your backend then calls Safaricom's B2C API:
    // POST https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest
    
    console.log('Initiating B2C payout:', request);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `KES ${request.amount} sent to ${request.phoneNumber}`
        });
      }, 2000);
    });
  }

  // Get transaction history from your backend
  async getTransactionHistory(_userId: string): Promise<unknown[]> {
    // This would fetch from your database
    return [];
  }
}

export const mpesaService = new MpesaService();

// Backend setup instructions (for reference)
export const BACKEND_SETUP = `
## M-Pesa Daraja API Backend Setup

### 1. Register on Safaricom Developer Portal
- Go to https://developer.safaricom.co.ke/
- Create an account and new app
- Get your Consumer Key and Consumer Secret

### 2. Required API Endpoints

#### STK Push (Deposit)
POST /api/mpesa/stkpush
- Receives: phoneNumber, amount, accountReference
- Calls Safaricom STK Push API
- Returns: CheckoutRequestID

#### STK Callback
POST /api/mpesa/callback
- Receives payment confirmation from Safaricom
- Updates user wallet balance
- Stores transaction record

#### B2C (Withdrawal/Payout)
POST /api/mpesa/b2c
- Receives: phoneNumber, amount
- Calls Safaricom B2C API
- Sends money to winner

### 3. Environment Variables
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode
MPESA_B2C_SHORTCODE=your_b2c_shortcode
MPESA_INITIATOR_NAME=your_initiator
MPESA_INITIATOR_PASSWORD=your_password
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback

### 4. Security Considerations
- Never expose API keys in frontend
- Validate all phone numbers
- Implement rate limiting
- Use HTTPS only
- Verify callback authenticity
`;
