import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const CreatePost = () => {
  const { setAlert } = useAlert();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    aiMlLevel: 'all'
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const { title, content, category, tags, aiMlLevel } = formData;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get('/api/categories');
        setCategories(res.data.data);
        setLoading(false);
      } catch (err) {
        setAlert('Error fetching categories', 'danger');
        setLoading(false);
      }
    };

    fetchCategories();
  }, [setAlert]);

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();

    if (!title || !content || !category) {
      setAlert('Please fill in all required fields', 'danger');
      return;
    }

    try {
      // Convert tags string to array
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

      const newPost = {
        title,
        content,
        category,
        tags: tagsArray,
        aiMlLevel
      };

      const res = await axios.post('/api/posts', newPost);
      setAlert('Post created successfully', 'success');
      navigate(`/posts/${res.data.data._id}`);
    } catch (err) {
      setAlert('Error creating post', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="form-container">
        <h1 className="form-title">Create New Post</h1>
        <p className="text-center mb-4">
          Share your question or knowledge with the community
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              className="form-control"
              id="title"
              name="title"
              value={title}
              onChange={onChange}
              placeholder="Enter a descriptive title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              className="form-control"
              id="category"
              name="category"
              value={category}
              onChange={onChange}
              required
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="content">Content *</label>
            <textarea
              className="form-control"
              id="content"
              name="content"
              value={content}
              onChange={onChange}
              rows="10"
              placeholder="Describe your question or share your knowledge in detail"
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma separated)</label>
            <input
              type="text"
              className="form-control"
              id="tags"
              name="tags"
              value={tags}
              onChange={onChange}
              placeholder="e.g. python, machine learning, career advice"
            />
          </div>

          <div className="form-group">
            <label htmlFor="aiMlLevel">AI/ML Experience Level</label>
            <select
              className="form-control"
              id="aiMlLevel"
              name="aiMlLevel"
              value={aiMlLevel}
              onChange={onChange}
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <button type="submit" className="btn btn-block">
            Create Post
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
