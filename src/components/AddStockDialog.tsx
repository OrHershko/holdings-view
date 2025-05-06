import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { addStock, uploadPortfolio } from '@/services/portfolioService';

// Type for data passed to onAddGuestStocks, should match Index.tsx
interface GuestStockAddData { 
  symbol: string; 
  shares: number; 
  averageCost: number; 
  name?: string; 
}

interface AddStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isGuest?: boolean;
  onAddGuestStocks?: (stocks: GuestStockAddData[]) => void; // Added prop
}

interface StockEntry {
  symbol: string;
  shares: number;
  averageCost: number;
}

interface HoldingCsvRow {
  Symbol: string;
  Shares: string; // Read as string first for parsing
  AverageCost: string; // Read as string first for parsing
}

const AddStockDialog: React.FC<AddStockDialogProps> = ({ isOpen, onClose, isGuest, onAddGuestStocks }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([{ symbol: '', shares: 0, averageCost: 0 }]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddStockEntry = () => {
    setStockEntries([...stockEntries, { symbol: '', shares: 0, averageCost: 0 }]);
  };

  const handleRemoveStockEntry = (index: number) => {
    if (stockEntries.length > 1) {
      const newEntries = [...stockEntries];
      newEntries.splice(index, 1);
      setStockEntries(newEntries);
    }
  };

  const handleStockEntryChange = (index: number, field: keyof StockEntry, value: string) => {
    const newEntries = [...stockEntries];
    if (field === 'symbol') {
      newEntries[index].symbol = value;
    } else if (field === 'shares') {
      newEntries[index].shares = value === '' ? 0 : Number(value);
    } else if (field === 'averageCost') {
      newEntries[index].averageCost = value === '' ? 0 : Number(value);
    }
    setStockEntries(newEntries);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validEntries = stockEntries.filter(entry => 
        entry.symbol.trim() !== '' && entry.shares > 0 && entry.averageCost >= 0 // Allow 0 cost for now, can be refined
      );

      if (validEntries.length === 0) {
        throw new Error('No valid stock entries found');
      }

      if (isGuest && onAddGuestStocks) {
        onAddGuestStocks(validEntries.map(entry => ({ 
          symbol: entry.symbol.toUpperCase(), 
          shares: entry.shares, 
          averageCost: entry.averageCost,
          name: entry.symbol.toUpperCase() // Or fetch name if possible before calling
        })));
        toast({
          title: 'Success (Guest)',
          description: `${validEntries.length} stock(s) prepared for guest portfolio`,
        });
        onClose();
      } else if (!isGuest) {
        for (const entry of validEntries) {
          await addStock({
            symbol: entry.symbol.toUpperCase(),
            shares: entry.shares,
            averageCost: entry.averageCost,
          });
        }
        await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' });
        toast({
          title: 'Success',
          description: `${validEntries.length} stock(s) added to portfolio successfully`,
        });
        onClose();
      } else {
        throw new Error('Guest add function not provided');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add stocks to portfolio',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create CSV content with headers and example data
    const csvContent = "Symbol,Shares,AverageCost\nAAPL,10,150.00\nMSFT,5,280.50";
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link and trigger download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'portfolio_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a CSV file first',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      if (!selectedFile) {
        throw new Error('No file selected');
      }

      setIsLoading(true);

      Papa.parse<HoldingCsvRow>(selectedFile, {
        header: true,
        complete: async (results) => {
          try {
            const { data, errors, meta } = results;
            
            if (errors.length > 0) {
              throw new Error(`Error parsing CSV: ${errors[0].message}`);
            }
            
            if (data.length === 0) {
              throw new Error('CSV file contains no data');
            }
            
            // Find required columns
            const headers = meta.fields || [];
            const hasSymbol = headers.includes('Symbol');
            const hasShares = headers.includes('Shares');
            const hasAverageCost = headers.includes('AverageCost');
            
            if (!hasSymbol || !hasShares || !hasAverageCost) {
              throw new Error('CSV must have Symbol, Shares, and AverageCost columns');
            }

            // Filter and validate rows
            const validRows = data.filter(row => row.Symbol && row.Shares && row.AverageCost);
            
            if (validRows.length === 0) {
              throw new Error('No valid data found in CSV file');
            }

            // Process each stock and prepare for batch upload
            const holdingsToUpload: GuestStockAddData[] = validRows.map(row => {
              const shares = parseFloat(row.Shares);
              const avgCost = parseFloat(row.AverageCost);
              
              if (isNaN(shares) || shares <= 0) {
                throw new Error(`Invalid share amount for ${row.Symbol}`);
              }
              
              if (isNaN(avgCost) || avgCost <= 0) {
                throw new Error(`Invalid average cost for ${row.Symbol}`);
              }

              return {
                symbol: row.Symbol.toUpperCase(),
                shares: shares,
                averageCost: avgCost,
              };
            });
            
            if (isGuest && onAddGuestStocks) {
              onAddGuestStocks(holdingsToUpload);
              toast({
                title: 'Success (Guest)',
                description: `${holdingsToUpload.length} stocks prepared from CSV for guest portfolio`,
              });
            } else if (!isGuest) {
              await uploadPortfolio(holdingsToUpload); // uploadPortfolio expects HoldingCreate[] which matches GuestStockAddData here
              queryClient.invalidateQueries({ queryKey: ['portfolio'] });
              toast({
                title: 'Success',
                description: `${validRows.length} stocks uploaded successfully`,
              });
            } else {
              throw new Error('Guest add function not provided for CSV upload');
            }
            
            // Reset the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            
            setSelectedFile(null);
            onClose();
          } catch (error: any) {
            console.error('Error processing CSV:', error);
            toast({
              title: 'Error',
              description: error.message || 'Failed to process CSV',
              variant: 'destructive',
            });
          } finally {
            setIsLoading(false);
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          toast({
            title: 'Error',
            description: `Failed to parse CSV: ${error.message}`,
            variant: 'destructive',
          });
          setIsLoading(false);
        },
      });
    } catch (error: any) {
      console.error('Error handling CSV upload:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload CSV',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stocks to Portfolio</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="csv">Upload CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-4 overflow-y-auto max-h-[400px] pr-2">
                {stockEntries.map((entry, index) => (
                  <div key={index} className="grid gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Stock #{index + 1}</span>
                      {stockEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveStockEntry(index)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Label htmlFor={`symbol-${index}`} className="text-left w-20">
                        Symbol
                      </Label>
                      <Input
                        id={`symbol-${index}`}
                        value={entry.symbol}
                        onChange={(e) => handleStockEntryChange(index, 'symbol', e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., AAPL"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <Label htmlFor={`shares-${index}`} className="text-left w-20">
                        Shares
                      </Label>
                      <Input
                        id={`shares-${index}`}
                        type="number"
                        value={entry.shares || ''}
                        onChange={(e) => handleStockEntryChange(index, 'shares', e.target.value)}
                        className="col-span-3"
                        placeholder="Number of shares"
                        required
                        min="0.0001"
                        step="0.0001"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <Label htmlFor={`averageCost-${index}`} className="text-left w-20">
                        Avg. Cost
                      </Label>
                      <Input
                        id={`averageCost-${index}`}
                        type="number"
                        value={entry.averageCost || ''}
                        onChange={(e) => handleStockEntryChange(index, 'averageCost', e.target.value)}
                        className="col-span-3"
                        placeholder="Average cost per share"
                        required
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mt-2" 
                  onClick={handleAddStockEntry}
                >
                  Add Another Stock
                </Button>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Stocks'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="csv" className="mt-4">
            <DialogDescription className="mb-4">
              Upload a CSV file with columns: Symbol, Shares, AverageCost.
            </DialogDescription>
            
            <div className="grid gap-4 py-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">CSV Template</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="text-xs" 
                  onClick={handleDownloadTemplate}
                >
                  Download Template
                </Button>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="col-span-4"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Expected columns: Symbol, Shares, AverageCost
              </p>
            </div>
            
            <DialogFooter className="sm:justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCsvUpload} 
                disabled={isLoading || !selectedFile}
              >
                {isLoading ? 'Uploading...' : 'Upload CSV'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddStockDialog;
