import { Box, Paper, Stack, Typography } from '@mui/material';

export interface ResumeItem {
  label: string;
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

interface ResumeBarProps {
  items: ResumeItem[];
}

/** <ResumeBar /> — Cards de totalizadores (contagens, somas). */
export function ResumeBar({ items }: ResumeBarProps) {
  return (
    <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Paper
          key={item.label}
          variant="outlined"
          sx={{
            px: 3,
            py: 1.5,
            minWidth: 160,
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
            {item.label}
          </Typography>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700 }}
              color={item.color ? `${item.color}.main` : 'text.primary'}
            >
              {item.value}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}
