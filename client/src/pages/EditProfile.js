import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const EditProfile = () => {
  const { user, updateProfile } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();
  useDocumentTitle('Edit Profile');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    currentRole: '',
    targetRole: '',
    aiMlExperience: '',
    skills: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        currentRole: user.currentRole || '',
        targetRole: user.targetRole || '',
        aiMlExperience: user.aiMlExperience || 'beginner',
        skills: user.skills ? user.skills.join(', ') : ''
      });
    }
  }, [user]);

  const { name, email, bio, currentRole, targetRole, aiMlExperience, skills } = formData;

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();

    // Convert skills string to array
    const skillsArray = skills
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill !== '');

    const updatedData = {
      name,
      email,
      bio,
      currentRole,
      targetRole,
      aiMlExperience,
      skills: skillsArray
    };

    const success = await updateProfile(updatedData);

    if (success) {
      setAlert('Profile updated successfully', 'success');
      navigate(`/profile/${user._id}`);
    }
  };

  return (
    <div className="main-content">
      <div className="form-container">
        <h1 className="form-title">Edit Profile</h1>
        <p className="text-center mb-4">
          Update your profile information
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              value={name}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              value={email}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              className="form-control"
              id="bio"
              name="bio"
              value={bio}
              onChange={onChange}
              placeholder="Tell us about yourself"
              rows="4"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="currentRole">Current Role/Profession</label>
            <input
              type="text"
              className="form-control"
              id="currentRole"
              name="currentRole"
              value={currentRole}
              onChange={onChange}
              placeholder="e.g. Software Developer, Data Analyst, Student"
            />
          </div>

          <div className="form-group">
            <label htmlFor="targetRole">Target AI/ML Role</label>
            <input
              type="text"
              className="form-control"
              id="targetRole"
              name="targetRole"
              value={targetRole}
              onChange={onChange}
              placeholder="e.g. Machine Learning Engineer, Data Scientist"
            />
          </div>

          <div className="form-group">
            <label htmlFor="aiMlExperience">AI/ML Experience Level</label>
            <select
              className="form-control"
              id="aiMlExperience"
              name="aiMlExperience"
              value={aiMlExperience}
              onChange={onChange}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="skills">Skills (comma separated)</label>
            <input
              type="text"
              className="form-control"
              id="skills"
              name="skills"
              value={skills}
              onChange={onChange}
              placeholder="e.g. Python, TensorFlow, Data Analysis"
            />
          </div>

          <button type="submit" className="btn btn-block">
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
