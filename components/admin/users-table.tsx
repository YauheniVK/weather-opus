"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Ban,
  CheckCircle,
  Crown,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile, PaginatedResponse } from "@/types";

export function AdminUsersTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editValues, setEditValues] = useState({
    role: "user",
    subscription_status: "free",
    is_blocked: false,
  });

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: PaginatedResponse<UserProfile> = await res.json();
      setUsers(data.data);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setEditValues({
      role: user.role,
      subscription_status: user.subscription_status,
      is_blocked: user.is_blocked,
    });
    setEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("User updated successfully");
      setEditDialog(false);
      fetchUsers();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleBlock = async (user: UserProfile) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_blocked: !user.is_blocked }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(user.is_blocked ? "User unblocked" : "User blocked");
      fetchUsers();
    } catch {
      toast.error("Failed to update user");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{total} total users</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={fetchUsers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={user.is_blocked ? "opacity-50" : ""}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? ""} />
                        <AvatarFallback className="text-xs">
                          {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge className="gap-1 bg-orange-500/15 text-orange-500 border-0">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" />
                        User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.subscription_status === "premium" ? (
                      <Badge variant="premium" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge variant="free">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="h-3 w-3" />
                        Blocked
                      </Badge>
                    ) : (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEditDialog(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_blocked ? "outline" : "ghost"}
                        className={`h-7 px-2 text-xs ${!user.is_blocked ? "text-destructive hover:text-destructive" : ""}`}
                        onClick={() => handleToggleBlock(user)}
                      >
                        {user.is_blocked ? "Unblock" : "Block"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={editValues.role}
                onValueChange={(v) => setEditValues({ ...editValues, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subscription</Label>
              <Select
                value={editValues.subscription_status}
                onValueChange={(v) =>
                  setEditValues({ ...editValues, subscription_status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Account Status</Label>
              <Select
                value={editValues.is_blocked ? "blocked" : "active"}
                onValueChange={(v) =>
                  setEditValues({ ...editValues, is_blocked: v === "blocked" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={editLoading} variant="gradient">
              {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
