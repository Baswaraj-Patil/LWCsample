import { LightningElement, track } from 'lwc';

export default class CanvasRecordUpsert extends LightningElement {
    @track accountName = '';
    @track statusMessage = '';
    @track isError = false;
    @track isProcessing = false;

    // Fetch parameters dynamically from the browser's current address line
    urlParams = new URLSearchParams(window.location.search);
    sfToken = this.urlParams.get('token');
    sfInstance = this.urlParams.get('instance');

    handleNameChange(event) {
        this.accountName = event.target.value;
    }

    get statusClass() {
        return this.isError ? 'status-error' : 'status-success';
    }

    async triggerSalesforceUpsert() {
        if (!this.accountName.trim()) {
            this.isError = true;
            this.statusMessage = 'Please provide an account name string before submitting.';
            return;
        }

        this.isProcessing = true;
        this.isError = false;
        this.statusMessage = 'Processing record transaction in Salesforce cloud...';

        try {
            // Fetch proxy call to our own node backend wrapper
            const res = await fetch('/api/upsert-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountName: this.accountName,
                    token: this.sfToken,
                    instanceUrl: this.sfInstance
                })
            });

            const data = await res.json();
            if (data.success) {
                this.isError = false;
                this.statusMessage = data.message;
                this.accountName = ''; 
            } else {
                this.isError = true;
                this.statusMessage = 'Error: ' + JSON.stringify(data.errors);
            }
        } catch (err) {
            this.isError = true;
            this.statusMessage = 'Network Exception: ' + err.message;
        } finally {
            this.isProcessing = false;
        }
    }
}
