import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface BranchSelectorProps {
  value: string;
  onChange: (value: string) => void;
  showAll?: boolean;
  className?: string;
}

export function BranchSelector({ value, onChange, showAll = true, className }: BranchSelectorProps) {
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setBranches(data || []);
      
      // Auto-select first branch if none selected and showAll is false
      if (!value && data && data.length > 0 && !showAll) {
        onChange(data[0].id);
      }
    } catch (error) {
      console.error("Error loading branches:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading branches...</span>
      </div>
    );
  }

  if (branches.length === 0) {
    return null;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-[200px] ${className}`}>
        <Building2 className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="all">All Branches</SelectItem>}
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
