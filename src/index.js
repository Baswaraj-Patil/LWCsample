import { createElement } from 'lwc';
import CanvasRecordUpsert from 'my/canvasRecordUpsert';

// Initialize your custom open-source LWC element
const app = createElement('my-canvas-record-upsert', {
    is: CanvasRecordUpsert
});

// Inject the component cleanly into the document body layout
document.body.appendChild(app);
