/**
 * @file ipfs.js
 * @description Modul untuk interaksi dengan IPFS via Pinata
 */

const PINATA_API_KEY = '1e95b776e285f50ba9d4';
const PINATA_SECRET_KEY = '99ff07075a3601c0af466d2acc4df71a9514b40f83b0c8c65a77b36e87d3feb0';

/**
 * Upload file ke IPFS menggunakan Pinata
 * @param {File} file - File object dari input type="file"
 * @returns {Promise<string>} IPFS CID
 */
async function uploadToPinata(file) {
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

    // Buat FormData
    const formData = new FormData();
    formData.append('file', file);

    // Opsional: Tambahkan metadata agar mudah diidentifikasi di Pinata dashboard
    const metadata = JSON.stringify({
        name: `Donachain - ${file.name}`,
        keyvalues: {
            app: 'donachain',
            type: 'campaign-image'
        }
    });
    formData.append('pinataMetadata', metadata);

    // Opsional: Tambahkan options
    const options = JSON.stringify({
        cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_KEY
                // Content-Type header will be set automatically with boundary by fetch for FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Pinata Upload Error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        return result.IpfsHash; // Ini adalah CID

    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        throw error;
    }
}

// Export fungsi ke global window object
window.DonaIPFS = {
    uploadToPinata
};

console.log('✅ IPFS Module loaded');
