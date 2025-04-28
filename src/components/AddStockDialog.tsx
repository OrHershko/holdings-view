  import React, { useState, useRef } from 'react';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
  import { addStockToFirestore } from '@/services/firebaseService';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { useToast } from '@/components/ui/use-toast';
  import { useQueryClient } from '@tanstack/react-query';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import Papa from 'papaparse';

  interface AddStockDialogProps {
    isOpen: boolean;
    onClose: () => void;
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

  const AddStockDialog: React.FC<AddStockDialogProps> = ({ isOpen, onClose }) => {
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
        // Filter out invalid entries
        const validEntries = stockEntries.filter(entry => 
          entry.symbol.trim() !== '' && entry.shares > 0 && entry.averageCost > 0
        );

        if (validEntries.length === 0) {
          throw new Error('No valid stock entries found');
        }

        // Add each stock to the portfolio
        for (const entry of validEntries) {
          await addStockToFirestore({
            symbol: entry.symbol.toUpperCase(),
            name: entry.symbol.toUpperCase(), // Basic name - could be improved with API lookup
            shares: entry.shares,
            averageCost: entry.averageCost,
          });
        }

        // Invalidate and refetch queries
        await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' });

        toast({
          title: 'Success',
          description: `${validEntries.length} stock(s) added to portfolio successfully`,
        });

        // Close the dialog
        onClose();
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
      const csvContent = 'Symbol,Shares,AverageCost\nAAPL,10,150.00\nMSFT,5,300.50';
      
      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create a temporary URL for the Blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stock_template.csv');
      
      // Append the link to the document, click it, and remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Release the URL object
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Template Downloaded',
        description: 'CSV template has been downloaded.',
      });
    };

    const handleCsvUpload = async () => {
      if (!selectedFile) {
        toast({
          title: 'No file selected',
          description: 'Please select a CSV file to upload.',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);

      Papa.parse<HoldingCsvRow>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedData = results.data;
          const errors = results.errors;

          if (errors.length > 0) {
            console.error('CSV Parsing errors details:', errors);
            const errorMessages = errors.slice(0, 3).map(e => `Row ${e.row}: ${e.message}`).join('; ');
            toast({
              title: 'CSV Parsing Error',
              description: `Errors found: ${errorMessages}${errors.length > 3 ? '...' : ''}`,
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }

          // Validate required headers and format data
          const requiredHeaders = ['Symbol', 'Shares', 'AverageCost'];
          const actualHeaders = Object.keys(parsedData[0] || {});
          if (!requiredHeaders.every(header => actualHeaders.includes(header))) {
            toast({
              title: 'Invalid CSV Headers',
              description: 'CSV must contain columns: Symbol, Shares, AverageCost',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }

          const formattedHoldings = parsedData.map(row => ({
            symbol: row.Symbol?.trim(),
            shares: parseFloat(row.Shares),
            averageCost: parseFloat(row.AverageCost),
          })).filter(h => h.symbol && !isNaN(h.shares) && h.shares > 0 && !isNaN(h.averageCost) && h.averageCost >= 0);

          if (formattedHoldings.length === 0) {
            toast({
              title: 'No valid holdings found',
              description: 'Check the CSV data and format.',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }

          try {
            // Add each stock to the portfolio
            for (const entry of formattedHoldings) {
              await addStockToFirestore({
                symbol: entry.symbol.toUpperCase(),
                name: entry.symbol.toUpperCase(),
                shares: entry.shares,
                averageCost: entry.averageCost,
              });
            }

            // Invalidate the portfolio query
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            
            toast({
              title: 'Upload Successful',
              description: `${formattedHoldings.length} holdings uploaded.`,
            });

            setSelectedFile(null); // Clear selection
            if (fileInputRef.current) {
              fileInputRef.current.value = ''; // Reset file input
            }
            onClose(); // Close dialog
          } catch (error: any) {
            toast({
              title: 'Error Uploading CSV',
              description: error.message || 'Something went wrong during the upload.',
              variant: 'destructive',
            });
          } finally {
            setIsLoading(false);
          }
        },
        error: (error) => {
          console.error('CSV Parsing error:', error);
          toast({
            title: 'Error Reading File',
            description: error.message,
            variant: 'destructive',
          });
          setIsLoading(false);
        }
      });
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Add Stock to Portfolio</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="csv">Upload CSV</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6 py-4">
                  {stockEntries.map((entry, index) => (
                    <div key={index} className="grid gap-4 border p-4 rounded-md relative pt-12">
                      {stockEntries.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          className="absolute right-4 top-2 h-8 w-8 p-0 rounded-full hover:bg-muted"
                          onClick={() => handleRemoveStockEntry(index)}
                        >
                          ×
                        </Button>
                      )}
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