import API_URL from '../config/api';

class BranchService {
  async getBranches() {
    const response = await fetch(`${API_URL}/api/branches`);

    if (!response.ok) {
      throw new Error('Failed to load branches');
    }

    const data = await response.json();
    // Handle both array response and object with branches property
    if (Array.isArray(data)) {
      return data;
    } else if (data?.branches && Array.isArray(data.branches)) {
      return data.branches;
    }
    return [];
  }
}

const branchService = new BranchService();
export default branchService;

