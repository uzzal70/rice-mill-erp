'use client';

import { useMemo, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Checkbox, Chip, CircularProgress,
  Divider, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Stack, Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

type Permission = { id: string; resource: string; action: string; description?: string | null };
type Role = {
  id: string;
  companyId: string | null;
  name: string;
  code: string;
  description?: string | null;
  systemRole: boolean;
  permissions: Array<{ permissionId: string; permission: Permission }>;
};

const labels = {
  en: {
    title: 'Role permissions',
    subtitle: 'Configure permissions by role. Changes are checked against your own grants and recorded in the audit log.',
    role: 'Role',
    refresh: 'Refresh',
    readOnly: 'Platform roles are read-only here.',
    selectRole: 'Select a role to configure permissions.',
    save: 'Save permissions',
    saved: 'Role permissions saved',
    empty: 'No permissions are available for this company.',
    loading: 'Loading role permissions…',
    failed: 'Could not load role permissions.',
    noGrants: 'No permissions granted',
  },
  bn: {
    title: 'রোল অনুমতি',
    subtitle: 'রোল অনুযায়ী অনুমতি নির্ধারণ করুন। আপনার নিজস্ব অনুমতির বাইরে অনুমতি দেওয়া যাবে না এবং পরিবর্তন অডিট লগে থাকবে।',
    role: 'রোল',
    refresh: 'রিফ্রেশ',
    readOnly: 'প্ল্যাটফর্ম রোল এখানে পরিবর্তনযোগ্য নয়।',
    selectRole: 'অনুমতি নির্ধারণ করতে একটি রোল বাছুন।',
    save: 'অনুমতি সংরক্ষণ',
    saved: 'রোলের অনুমতি সংরক্ষিত হয়েছে',
    empty: 'এই কোম্পানির জন্য কোনো অনুমতি নেই।',
    loading: 'রোলের অনুমতি লোড হচ্ছে…',
    failed: 'রোলের অনুমতি লোড করা যায়নি।',
    noGrants: 'কোনো অনুমতি দেওয়া নেই',
  },
} as const;

export function RolesPage({
  companyId,
  language,
  onSaved,
  onError,
}: {
  companyId: string;
  language: 'en' | 'bn';
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const t = labels[language];
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState('');
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const rolesQuery = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => apiRequest<Role[]>(`/roles?companyId=${encodeURIComponent(companyId)}`),
    enabled: Boolean(companyId),
  });
  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: () => apiRequest<Permission[]>('/roles/permissions'),
    enabled: Boolean(companyId),
  });
  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];
  const selectedRole = roles.find(role => role.id === roleId) ?? null;

  const groups = useMemo(() => {
    const result = new Map<string, Permission[]>();
    for (const permission of permissions) {
      result.set(permission.resource, [...(result.get(permission.resource) ?? []), permission]);
    }
    return [...result.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [permissions]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedRole) throw new Error(t.selectRole);
      return apiRequest<Role>(`/roles/${selectedRole.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ companyId, permissionIds }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles', companyId] });
      onSaved(t.saved);
    },
    onError: error => onError(error instanceof Error ? error.message : t.failed),
  });

  function chooseRole(nextRoleId: string) {
    setRoleId(nextRoleId);
    const role = roles.find(candidate => candidate.id === nextRoleId);
    setPermissionIds(role?.permissions.map(grant => grant.permissionId) ?? []);
  }

  function togglePermission(permissionId: string, checked: boolean) {
    setPermissionIds(current => checked
      ? current.includes(permissionId) ? current : [...current, permissionId]
      : current.filter(id => id !== permissionId));
  }

  const loading = rolesQuery.isLoading || permissionsQuery.isLoading;
  const error = rolesQuery.error ?? permissionsQuery.error;

  return <Stack spacing={2.5}>
    <Box>
      <Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography>
      <Typography color="text.secondary" fontSize={13} mt={.5}>{t.subtitle}</Typography>
    </Box>
    {error && <Alert severity="error">{error instanceof Error ? error.message : t.failed}</Alert>}
    {selectedRole?.systemRole && <Alert severity="info">{t.readOnly}</Alert>}
    <Paper className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <FormControl size="small" sx={{ minWidth: { sm: 300 }, flex: 1 }}>
          <InputLabel>{t.role}</InputLabel>
          <Select label={t.role} value={roleId} onChange={event => chooseRole(event.target.value)}>
            {roles.map(role => <MenuItem key={role.id} value={role.id}>
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{role.name}</span><Chip size="small" label={role.code} />
                {role.systemRole && <Chip size="small" color="default" label="SYSTEM" />}
              </Stack>
            </MenuItem>)}
          </Select>
        </FormControl>
        <Button onClick={() => { void rolesQuery.refetch(); void permissionsQuery.refetch(); }} disabled={loading}>{t.refresh}</Button>
      </Stack>
    </Paper>
    {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} /><Typography ml={1.5}>{t.loading}</Typography></Box>}
    {!loading && selectedRole && !selectedRole.systemRole && <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Box>
          <Typography className="brand-font" fontWeight={800}>{selectedRole.name}</Typography>
          <Typography color="text.secondary" fontSize={11}>{selectedRole.description || selectedRole.code}</Typography>
        </Box>
        <Chip label={`${permissionIds.length} / ${permissions.length}`} size="small" />
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      {groups.map(([resource, resourcePermissions]) => <Accordion key={resource} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 1 }}>
          <Typography fontSize={13} fontWeight={800} sx={{ flex: 1 }}>{resource.replaceAll('-', ' ')}</Typography>
          <Chip size="small" label={`${resourcePermissions.filter(permission => permissionIds.includes(permission.id)).length}/${resourcePermissions.length}`} />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: .5 }}>
            {resourcePermissions.map(permission => <FormControlLabel
              key={permission.id}
              control={<Checkbox size="small" checked={permissionIds.includes(permission.id)} onChange={event => togglePermission(permission.id, event.target.checked)} />}
              label={<Stack><Typography fontSize={12}>{permission.action}</Typography>{permission.description && <Typography fontSize={10} color="text.secondary">{permission.description}</Typography>}</Stack>}
              sx={{ alignItems: 'flex-start', mx: 0 }}
            />)}
          </Box>
        </AccordionDetails>
      </Accordion>)}
      {!permissions.length && <Typography color="text.secondary" fontSize={12}>{t.empty}</Typography>}
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button variant="contained" disabled={saveMutation.isPending || !permissions.length} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <CircularProgress size={18} color="inherit" /> : t.save}
        </Button>
      </Stack>
    </Paper>}
    {!loading && !selectedRole && <Alert severity="info">{roles.length ? t.selectRole : t.empty}</Alert>}
  </Stack>;
}
