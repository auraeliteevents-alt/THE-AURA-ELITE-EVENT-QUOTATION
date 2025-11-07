import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Quotation, LineItem, Client } from './types';
import { generateDescription } from './services/geminiService';
import { SparkleIcon, TrashIcon, PlusIcon, PrintIcon, DownloadIcon, UserIcon, FileTextIcon, CalendarIcon, UploadIcon, ImageIcon, XCircleIcon, PencilIcon } from './components/Icons';

declare global {
  interface Window {
    html2canvas: any;
    jspdf: any;
  }
}

const today = new Date();
const oneMonthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const initialQuotation: Quotation = {
  company: {
    name: 'The Aura Elite Events',
    address: '18/10 new bypass ariyankuppam, puducherry-605007',
    email: 'theauraeliteevents@gmail.com',
    phone: '+91 9363682099',
  },
  client: {
    name: '',
    phone: '',
  },
  quotationNumber: `AEE-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}-001`,
  quotationDate: formatDate(today),
  validUntil: formatDate(oneMonthLater),
  items: [
    { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 },
  ],
  termsAndConditions: '1. 50% advance payment is required to confirm the booking.\n2. The remaining balance is to be paid on the day of the event.\n3. In case of cancellation, the advance payment is non-refundable.',
  gstRate: 18,
  advancePercentage: 50,
};

// Reusable Input Components
interface InputFieldProps {
  label: string;
  id: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  Icon?: React.ElementType;
  className?: string;
  min?: number;
  name?: string;
}
const InputField: React.FC<InputFieldProps> = ({ label, id, value, onChange, type = 'text', Icon, className = '', min, name }) => (
    <div className={`relative ${className}`}>
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <div className="relative">
            {Icon && <Icon className="w-5 h-5 absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" />}
            <input
                type={type}
                id={id}
                name={name || id}
                value={value}
                onChange={onChange}
                min={min}
                className={`w-full p-2 border rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 bg-white/50 border-[var(--corporate-border)] focus:border-[var(--corporate-border-focus)] focus:ring-[var(--corporate-border-focus)]/30 ${Icon ? 'pl-10' : ''}`}
            />
        </div>
    </div>
);

interface TextAreaProps {
    label: string;
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
}
const TextArea: React.FC<TextAreaProps> = ({ label, id, value, onChange, rows = 3 }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <textarea
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            rows={rows}
            className="w-full p-2 border rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 bg-white/50 border-[var(--corporate-border)] focus:border-[var(--corporate-border-focus)] focus:ring-[var(--corporate-border-focus)]/30"
        />
    </div>
);

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    canvasRef: React.RefObject<HTMLCanvasElement>;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, canvasRef }) => {
    const isDrawing = useRef(false);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, [canvasRef]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size based on its display size for high-DPI screens
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        ctx.scale(1, 1);

        const getPos = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;
            if (e instanceof MouseEvent) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        const startDrawing = (e: MouseEvent | TouchEvent) => {
            isDrawing.current = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };

        const draw = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing.current) return;
            e.preventDefault();
            const pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };

        const stopDrawing = () => {
            isDrawing.current = false;
        };

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#333';

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseout', stopDrawing);
            
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
        };
    }, [canvasRef]);

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (!context) return;
            // Create a temporary canvas to check if it's blank
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            if (canvas.toDataURL() === tempCanvas.toDataURL()) {
                onSave(''); // Save empty if blank
            } else {
                onSave(canvas.toDataURL('image/png'));
            }
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <canvas ref={canvasRef} className="border border-[var(--corporate-border)] rounded-md bg-white w-full h-[150px] touch-none"></canvas>
            <div className="flex gap-2">
                <button type="button" onClick={handleSave} className="flex-1 text-sm py-1.5 px-3 rounded-md accent-bg text-white font-medium">Save Signature</button>
                <button type="button" onClick={clearCanvas} className="flex-1 text-sm py-1.5 px-3 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium">Clear</button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [quotation, setQuotation] = useState<Quotation>(() => {
    const lastNumberStr = localStorage.getItem('lastQuotationNumber');
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `AEE-${year}${month}-`;
    
    let nextSequence = 1;
    
    if (lastNumberStr && lastNumberStr.startsWith(prefix)) {
        const lastSequence = parseInt(lastNumberStr.substring(prefix.length), 10);
        if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
        }
    }
    
    const newQuotationNumber = `${prefix}${nextSequence.toString().padStart(3, '0')}`;
    
    return {
        ...initialQuotation,
        quotationNumber: newQuotationNumber
    };
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatingItems, setGeneratingItems] = useState<Set<string>>(new Set());
  
  const authSignatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const clientSignatureCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleClientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setQuotation(prev => ({
      ...prev,
      client: { ...prev.client, [name]: value }
    }));
  }, []);

  const handleQuotationInfoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setQuotation(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    setQuotation(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }, []);

  const addNewItem = useCallback(() => {
    setQuotation(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 }],
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setQuotation(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  }, []);
  
  const handleGenerateDescription = useCallback(async (id: string, currentDescription: string) => {
    if(!currentDescription.trim()) return;
    setGeneratingItems(prev => new Set(prev).add(id));
    try {
        const newDescription = await generateDescription(currentDescription);
        handleItemChange(id, 'description', newDescription);
    } finally {
        setGeneratingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    }
  }, [handleItemChange]);

  const handleTermsAndConditionsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuotation(prev => ({ ...prev, termsAndConditions: e.target.value }));
  }, []);
  
  const handleGstChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseFloat(e.target.value) || 0);
    setQuotation(prev => ({ ...prev, gstRate: value }));
  }, []);

  const handleAdvanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseFloat(e.target.value) || 0);
    setQuotation(prev => ({ ...prev, advancePercentage: value }));
  }, []);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
          alert('File size should not exceed 2MB.');
          return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setQuotation(prev => ({
            ...prev,
            company: { ...prev.company, logoUrl: event.target.result as string }
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setQuotation(prev => {
        const { logoUrl, ...companyRest } = prev.company;
        return { ...prev, company: companyRest };
    });
  }, []);
  
  const handleSaveSignature = useCallback((type: 'authorized' | 'client', dataUrl: string) => {
      if (type === 'authorized') {
          setQuotation(prev => ({...prev, authorizedSignature: dataUrl}));
      } else {
          setQuotation(prev => ({...prev, clientSignature: dataUrl}));
      }
  }, []);

  const { subtotal, gstAmount, grandTotal, advanceAmount, balanceDue } = useMemo(() => {
    const subtotal = quotation.items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
    const gstRate = quotation.gstRate >= 0 ? quotation.gstRate : 0;
    const gstAmount = subtotal * (gstRate / 100);
    const grandTotal = subtotal + gstAmount;
    const advanceAmount = grandTotal * (quotation.advancePercentage / 100);
    const balanceDue = grandTotal - advanceAmount;
    return { subtotal, gstAmount, grandTotal, advanceAmount, balanceDue };
  }, [quotation.items, quotation.gstRate, quotation.advancePercentage]);

  const handlePrint = () => {
    localStorage.setItem('lastQuotationNumber', quotation.quotationNumber);
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    const printArea = document.getElementById('print-area');
    if (!printArea) {
        setIsDownloading(false);
        return;
    };
    
    localStorage.setItem('lastQuotationNumber', quotation.quotationNumber);

    const buttonsToHide = document.getElementById('pdf-buttons');
    if(buttonsToHide) (buttonsToHide as HTMLElement).style.display = 'none';

    try {
      const canvas = await window.html2canvas(printArea, {
          scale: 2, // Higher scale for better quality
          useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Quotation-${quotation.quotationNumber}.pdf`);
    } catch(error) {
        console.error("Failed to generate PDF:", error);
        alert("Sorry, there was an error generating the PDF. Please try again.");
    } finally {
        if(buttonsToHide) (buttonsToHide as HTMLElement).style.display = 'flex';
        setIsDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold header-text">
              The Aura Elite Events
          </h1>
          <p className="text-sm text-gray-500 mt-2">Quotation Maker</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-lg card-shadow space-y-8">
          {/* Company Logo Section */}
          <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ImageIcon className="w-6 h-6 accent-text" /> Company Logo</h2>
              <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-md border border-[var(--corporate-border)] flex items-center justify-center bg-gray-50 overflow-hidden">
                      {quotation.company.logoUrl ? (
                          <img src={quotation.company.logoUrl} alt="Company Logo" className="object-contain w-full h-full" />
                      ) : (
                          <ImageIcon className="w-10 h-10 text-gray-300" />
                      )}
                  </div>
                  <div className="flex-1 space-y-2">
                        <label htmlFor="logo-upload" className="cursor-pointer w-full text-center flex items-center justify-center gap-2 py-2 px-4 border border-[var(--corporate-border)] rounded-md hover:bg-gray-50 transition-colors">
                          <UploadIcon className="w-5 h-5" />
                          <span>Upload Logo</span>
                        </label>
                        <input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoChange} />
                        {quotation.company.logoUrl && (
                            <button onClick={handleRemoveLogo} className="w-full text-center flex items-center justify-center gap-2 py-2 px-4 border border-transparent text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm">
                                <XCircleIcon className="w-5 h-5" />
                                <span>Remove Logo</span>
                            </button>
                        )}
                  </div>
              </div>
          </div>
          
          {/* Client Info Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><UserIcon className="w-6 h-6 accent-text" /> Client Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Client Name" id="name" name="name" value={quotation.client.name} onChange={handleClientChange} />
                <InputField label="Client Phone" id="phone" name="phone" value={quotation.client.phone} onChange={handleClientChange} type="tel" />
            </div>
          </div>

          {/* Quotation Info Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><FileTextIcon className="w-6 h-6 accent-text" /> Quotation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InputField label="Quotation No." id="quotationNumber" value={quotation.quotationNumber} onChange={handleQuotationInfoChange} />
                <InputField label="Quotation Date" id="quotationDate" value={quotation.quotationDate} onChange={handleQuotationInfoChange} type="date" Icon={CalendarIcon} />
                <InputField label="Valid Until" id="validUntil" value={quotation.validUntil} onChange={handleQuotationInfoChange} type="date" Icon={CalendarIcon}/>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Services & Items</h2>
            <div className="space-y-4">
              {quotation.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 p-3 rounded-md border border-[var(--corporate-border)] bg-white/50">
                    <div className="col-span-12 md:col-span-6">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <div className="relative">
                            <textarea
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                rows={2}
                                placeholder="E.g., Stage Decoration"
                                className="w-full p-2 pr-10 border rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 bg-white/50 border-[var(--corporate-border)] focus:border-[var(--corporate-border-focus)] focus:ring-[var(--corporate-border-focus)]/30"
                            />
                            <button onClick={() => handleGenerateDescription(item.id, item.description)} disabled={generatingItems.has(item.id)} className="absolute top-1 right-1 p-1 text-[var(--corporate-accent)] hover:text-[var(--corporate-accent-hover)] disabled:text-gray-400 disabled:cursor-not-allowed">
                                {generatingItems.has(item.id) ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <SparkleIcon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                        <InputField label="Qty" id={`quantity-${item.id}`} value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)} type="number" min={0} />
                    </div>
                    <div className="col-span-8 md:col-span-3">
                        <InputField label="Rate (₹)" id={`rate-${item.id}`} value={item.rate} onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)} type="number" min={0} />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                        <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="col-span-12 text-right font-medium pr-10 md:pr-0">Amount: {formatCurrency(item.quantity * item.rate)}</div>
                </div>
              ))}
            </div>
            <button onClick={addNewItem} className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-[var(--corporate-border-focus)] text-[var(--corporate-accent)] rounded-md hover:bg-[var(--corporate-accent)]/10 transition-colors">
              <PlusIcon className="w-5 h-5" />
              <span>Add Item</span>
            </button>
          </div>

           {/* Terms & Conditions & Summary */}
           <div className="space-y-4">
              <TextArea label="Terms & Conditions" id="termsAndConditions" value={quotation.termsAndConditions} onChange={handleTermsAndConditionsChange} />
              <div className="grid grid-cols-2 gap-4">
                    <InputField label="GST Rate (%)" id="gstRate" value={quotation.gstRate} onChange={handleGstChange} type="number" min={0} />
                    <InputField label="Advance Payment (%)" id="advancePercentage" value={quotation.advancePercentage} onChange={handleAdvanceChange} type="number" min={0} />
              </div>
          </div>
          
          {/* Signature Section */}
          <div className="space-y-6">
              <div className="space-y-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><PencilIcon className="w-6 h-6 accent-text" /> Authorized Signature</h2>
                  <SignaturePad onSave={(dataUrl) => handleSaveSignature('authorized', dataUrl)} canvasRef={authSignatureCanvasRef} />
              </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><UserIcon className="w-6 h-6 accent-text" /> Client Signature</h2>
                  <SignaturePad onSave={(dataUrl) => handleSaveSignature('client', dataUrl)} canvasRef={clientSignatureCanvasRef} />
              </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:sticky top-8 self-start">
            <div id="print-area" className="p-8 rounded-lg card-shadow bg-white print-bg-white print-text-black">
                <div className="relative border-b-2 border-[var(--corporate-border)] print-border-gray pb-6 mb-6">
                    <h2 className="text-8xl font-bold font-display text-gray-100 print-hidden uppercase absolute -top-4 -right-4" style={{ color: 'rgba(201, 167, 109, 0.1)' }}>Quotation</h2>
                    <div className="flex justify-between items-start">
                        <div>
                            {quotation.company.logoUrl && <img src={quotation.company.logoUrl} alt="Company Logo" className="h-20 w-auto mb-4" />}
                            <h3 className="font-bold text-xl font-display">{quotation.company.name}</h3>
                            <p className="text-sm preview-text-secondary">{quotation.company.address}</p>
                            <p className="text-sm preview-text-secondary">{quotation.company.email} | {quotation.company.phone}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="font-bold text-2xl font-display">Quotation</h3>
                            <p className="text-sm preview-text-secondary"># {quotation.quotationNumber}</p>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                    <div>
                        <h4 className="font-semibold mb-1">Bill To:</h4>
                        <p className="font-medium">{quotation.client.name || 'Client Name'}</p>
                        <p className="preview-text-secondary">{quotation.client.phone || 'Client Phone'}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Quotation Date:</h4>
                        <p>{quotation.quotationDate}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Valid Until:</h4>
                        <p>{quotation.validUntil}</p>
                    </div>
                </div>
                
                <table className="w-full text-sm mb-8">
                    <thead className="text-left">
                        <tr>
                            <th className="p-2 font-semibold">Description</th>
                            <th className="p-2 font-semibold text-center w-20">Qty</th>
                            <th className="p-2 font-semibold text-right w-32">Rate</th>
                            <th className="p-2 font-semibold text-right w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotation.items.map(item => (
                            <tr key={item.id}>
                                <td className="p-2">{item.description || "Service/Item Description"}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-right">{formatCurrency(item.rate)}</td>
                                <td className="p-2 text-right">{formatCurrency(item.quantity * item.rate)}</td>
                            </tr>
                        ))}
                         {quotation.items.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-2 text-center preview-text-secondary">No items added.</td>
                            </tr>
                         )}
                    </tbody>
                </table>
                
                <div className="flex justify-end mb-8">
                    <div className="w-full max-w-sm space-y-2 text-sm">
                       <div className="flex justify-between">
                            <span className="preview-text-secondary">Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="preview-text-secondary">GST ({quotation.gstRate}%)</span>
                            <span>{formatCurrency(gstAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-b border-[var(--corporate-border)] print-border-gray py-2 my-1">
                            <span>Grand Total</span>
                            <span>{formatCurrency(grandTotal)}</span>
                        </div>
                        <div className="flex justify-between text-green-700 print-text-black">
                            <span className="preview-text-secondary">Advance Paid ({quotation.advancePercentage}%)</span>
                            <span>- {formatCurrency(advanceAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg accent-text print-text-black">
                            <span>Balance Due</span>
                            <span>{formatCurrency(balanceDue)}</span>
                        </div>
                    </div>
                </div>
                
                {quotation.termsAndConditions && (
                    <div className="mb-8">
                        <h4 className="font-semibold text-sm mb-1">Terms & Conditions:</h4>
                        <p className="text-xs whitespace-pre-wrap preview-text-secondary">{quotation.termsAndConditions}</p>
                    </div>
                )}

                <div className="flex justify-between items-end pt-8 mt-8 border-t border-[var(--corporate-border)] print-border-gray">
                    <div className="text-center">
                        {quotation.authorizedSignature ? (
                            <img src={quotation.authorizedSignature} alt="Authorized Signature" className="h-16 mx-auto" />
                        ) : <div className="h-16"></div>}
                        <p className="text-xs border-t border-gray-400 print-border-gray pt-1 mt-1">Authorized Signature</p>
                        <p className="text-xs font-semibold">{quotation.company.name}</p>
                    </div>
                    <div className="text-center">
                        {quotation.clientSignature ? (
                            <img src={quotation.clientSignature} alt="Client Signature" className="h-16 mx-auto" />
                        ) : <div className="h-16"></div>}
                        <p className="text-xs border-t border-gray-400 print-border-gray pt-1 mt-1">Client Signature</p>
                        <p className="text-xs font-semibold">{quotation.client.name || 'Client Name'}</p>
                    </div>
                </div>
            </div>
            <div id="pdf-buttons" className="flex items-center gap-4 mt-6 print-hidden">
                <button onClick={handleDownloadPdf} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md accent-bg text-white font-semibold disabled:bg-gray-400">
                    {isDownloading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating PDF...</span>
                        </>
                    ) : (
                        <>
                            <DownloadIcon className="w-5 h-5" />
                            <span>Download PDF</span>
                        </>
                    )}
                </button>
                <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold">
                    <PrintIcon className="w-5 h-5" />
                    <span>Print</span>
                </button>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;