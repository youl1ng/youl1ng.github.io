// "Under construction" footer (UNDER_CONSTRUCTION_FOOTER_HANDOFF.md, board U1). Edit copy here.
// Opt-in per page: render <UnderConstructionFooter /> only on unfinished pages.

export const underConstruction = {
  label: 'Under construction',
  wordmark: 'under construction',
  status: { label: 'status', lines: ['This page is still', 'under construction'] },
  meanwhile: {
    label: 'meanwhile',
    // a link to the page you're already on is left out
    links: [
      { label: 'Peek at my projects →', href: '/projects' },
      { label: 'Back to home →', href: '/' },
    ],
  },
};
