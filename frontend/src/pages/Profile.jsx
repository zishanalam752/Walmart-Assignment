import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, token, updateUser, logout } = useAuth();
  const { isListening, startListening, stopListening, transcript } = useVoice();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    language: 'english',
    voiceCommandsEnabled: true,
    notificationsEnabled: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        language: user.language || 'english',
        voiceCommandsEnabled: user.voiceCommandsEnabled ?? true,
        notificationsEnabled: user.notificationsEnabled ?? true
      });
    }
  }, [user]);

  useEffect(() => {
    if (transcript) {
      handleVoiceCommand(transcript);
    }
  }, [transcript]);

  const handleVoiceCommand = async (command) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          voiceCommand: command,
          language: formData.language,
          context: 'profile'
        })
      });

      if (!response.ok) throw new Error('Failed to process voice command');

      const data = await response.json();
      const { action, field, value } = data.data.processedCommand.extracted;

      switch (action) {
        case 'edit':
          setIsEditing(true);
          break;
        case 'save':
          handleSave();
          break;
        case 'update':
          if (field && value) {
            setFormData(prev => ({ ...prev, [field]: value }));
          }
          break;
        case 'toggle':
          if (field) {
            setFormData(prev => ({ ...prev, [field]: !prev[field] }));
          }
          break;
        case 'logout':
          handleLogout();
          break;
        default:
          showNotification('Could not understand the command', 'error');
      }
    } catch (error) {
      showNotification(error.message || 'Error processing voice command', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      updateUser(data.data.user);
      setIsEditing(false);
      showNotification('Profile updated successfully', 'success');
    } catch (error) {
      showNotification(error.message || 'Error updating profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleVoiceCommands = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      showNotification('Listening for voice commands...', 'info');
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <button
            onClick={toggleVoiceCommands}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              isListening
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isListening ? 'Stop Voice Commands' : 'Voice Commands'}
          </button>
        </div>

        {/* Voice Command Status */}
        {isListening && (
          <div className="mb-6 p-4 bg-indigo-100 rounded-lg">
            <p className="text-indigo-700">
              Listening... {transcript && `"${transcript}"`}
            </p>
            <p className="mt-2 text-sm text-indigo-600">
              Try saying: "Edit profile", "Update name to John", "Save changes", or "Logout"
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Preferences</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Language</label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="english">English</option>
                      <option value="hindi">Hindi</option>
                      <option value="spanish">Spanish</option>
                      <option value="french">French</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="voiceCommandsEnabled"
                      checked={formData.voiceCommandsEnabled}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable Voice Commands
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="notificationsEnabled"
                      checked={formData.notificationsEnabled}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable Notifications
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-indigo-600 hover:text-indigo-800"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-red-600 hover:text-red-800"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 