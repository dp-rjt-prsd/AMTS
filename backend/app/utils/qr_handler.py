"""QR Code generation utility"""

import io
import base64
import qrcode


def generate_qr_code_base64(data: str) -> str:
    """
    Generate QR code as base64 encoded PNG image
    
    Args:
        data: The data to encode in the QR code
        
    Returns:
        Base64 encoded PNG image string
    """
    
    try:
        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=2,
        )
        
        # Add data
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        
        # Get base64 string
        img_base64 = base64.b64encode(
            buffer.getvalue()
        ).decode('utf-8')
        
        return f"data:image/png;base64,{img_base64}"
        
    except Exception as e:
        raise Exception(
            f"Failed to generate QR code: {str(e)}"
        )
