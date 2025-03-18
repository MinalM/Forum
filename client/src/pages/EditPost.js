import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const EditPost = () => {
  const { id } = useParams();
  const { user } = useAuth();
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
    const fetchData = async () => {
      try {
        // Fetch post details
        const postRes = await axios.get(`/api/posts/${id}`);
        const postData = postRes.data.data;

        // Check if user is authorized to edit this post
        if (user._id !== postData.user._id && user.role !== 'admin') {
          setAlert('You are not authorized to edit this post', 'danger');
          navigate(`/posts/${id}`);
          return;
        }

        // Fetch categories
        const categoriesRes = await axios.get('/api/categories');
        setCategories(categoriesRes.data.data);

        // Set form data
        setFormData({
          title: postData.title,
          content: postData.content,
          category: postData.category._id,
          tags: postData.tags ? postData.tags.join(', ') : '',
          aiMlLevel: postData.aiMlLevel || 'all'
        });

        setLoading(false);
      } catch (err) {
        setAlert('Error fetching post data', 'danger');
        navigate('/');
      }
    };

    fetchData();
  }, [id, user, setAlert, navigate]);

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

      const updatedPost = {
        title,
        content,
        category,
        tags: tagsArray,
        aiMlLevel
      };

      await axios.put(`/api/posts/${id}`, updatedPost);
      setAlert('Post updated successfully', 'success');
      navigate(`/posts/${id}`);
    } catch (err) {
      setAlert('Error updating post', 'danger');
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
        <h1 className="form-title">Edit Post</h1>
        <p className="text-center mb-4">
          Update your post
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

          <div className="form-actions">
            <button type="submit" className="btn">
              Update Post
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/posts/${id}`)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPost;
