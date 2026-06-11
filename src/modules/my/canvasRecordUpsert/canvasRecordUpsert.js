import { LightningElement, track } from 'lwc';

export default class CanvasRecordUpsert extends LightningElement {
    @track accountName = '';
    @track statusMessage = '';
    @track isError = false;
    @track isProcessing = false;

    handleNameChange(event) {
        this.accountName = event.target.value;
    }

    async triggerSalesforceUpsert() {
        this.isProcessing = true;
        this.statusMessage = 'Processing record...';

        try {
            const res = await fetch('/api/upsert-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send only the input field data
                body: JSON.stringify({ accountName: this.accountName })
            });

            const data = await res.json();
            if (data.success) {
                this.isError = false;
                this.statusMessage = data.message;
                this.accountName = ''; 
            } else {
                this.isError = true;
                this.statusMessage = data.error || 'Transaction failure.';
            }
        } catch (err) {
            this.isError = true;
            this.statusMessage = 'Exception: ' + err.message;
        } finally {
            this.isProcessing = false;
        }
    }
}
